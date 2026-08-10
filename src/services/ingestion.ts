import * as fs from 'fs';
import * as path from 'path';
import { insertDocument, insertChunk, getDocumentByHash } from '../models/documentModel';
import { sha256 } from '../models/schema';
import type { LLMProvider } from '../llm/types';
import { buscarCnpj, extrairCnpjs } from './cnpjService';
import { getCompany, upsertCompany } from '../models/companyModel';
import { ZoraError } from '../errors/zoraErrors';

const CHUNK_SIZE = 500;

export interface IngestResult {
  documentId: string;
  filename: string;
  fileHash: string;
  chunks: number;
  fullText: string;
  duplicate?: boolean;
}

export function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractPdfText(buffer);
  }
  return Promise.resolve(buffer.toString('utf-8'));
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  let libraryReason = '';

  try {
    const pdfParse = require('pdf-parse');
    const res = await pdfParse(buffer);
    const text = res?.text ?? '';
    if (text.trim()) return text;
    libraryReason = 'pdf-parse retornou texto vazio';
  } catch (error) {
    libraryReason = (error as Error).message;
  }

  const cliText = await pdftotext(buffer);
  if (cliText !== null && cliText.trim()) return cliText;

  throw new ZoraError(
    'pdf_parse_failed',
    'Falha ao ler PDF' +
      (libraryReason ? ` (${libraryReason})` : '') +
      '. O arquivo pode estar escaneado (apenas imagem) ou o `pdftotext` (poppler-utils) não está instalado.',
  );
}

async function pdftotext(buffer: Buffer): Promise<string | null> {
  const { spawn } = require('child_process');
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn('pdftotext', ['-', '-'], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      resolve(null);
      return;
    }
    let out = '';
    let settled = false;
    const finish = (value: string | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    child.stdout.on('data', (d: Buffer) => (out += d.toString()));
    child.stderr.on('data', () => undefined);
    child.on('error', () => finish(null));
    child.on('close', (code: number | null) => finish(code === 0 ? out : null));
    child.stdin.on('error', () => finish(null));
    child.stdin.write(buffer, () => child.stdin.end());
  });
}

export function mimeFromExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.json':
      return 'application/json';
    case '.txt':
    case '.md':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

export function splitIntoChunks(text: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.slice(index, index + size));
    index += size;
  }
  return chunks.length > 0 ? chunks : [''];
}

async function enriquecerCnpjsDoDocumento(texto: string): Promise<void> {
  const cnpjs = extrairCnpjs(texto);
  if (cnpjs.length === 0) return;

  for (const cnpj of cnpjs) {
    const local = getCompany(cnpj);
    if (local?.raw_data) continue;

    try {
      const dados = await buscarCnpj(cnpj);
      if (dados?.nome) {
        upsertCompany(cnpj, {
          raw_data: dados,
          company_name: dados.nome,
          trade_name: dados.fantasia ?? null,
        });
      }
    } catch {
      // API indisponível: o documento segue o fluxo normal de chunks
    }
  }
}

export async function ingestFile(
  llm: LLMProvider,
  filepath: string,
): Promise<IngestResult> {
  const buffer = fs.readFileSync(filepath);
  const filename = path.basename(filepath);
  const mimeType = mimeFromExtension(filename);

  const fileHash = sha256(buffer);
  const existing = getDocumentByHash(fileHash);
  if (existing) {
    return {
      documentId: existing.id,
      filename,
      fileHash,
      chunks: 0,
      fullText: '',
      duplicate: true,
    };
  }

  const fullText = await extractText(buffer, mimeType);

  if (!fullText.trim()) {
    throw new ZoraError('empty_document', `O arquivo ${filename} não contém texto extraível.`);
  }

  const documentId = insertDocument({
    filename,
    file_hash: fileHash,
    mime_type: mimeType,
    full_text: fullText,
    original_blob: buffer,
  }).id;

  await enriquecerCnpjsDoDocumento(fullText);

  const chunks = splitIntoChunks(fullText);
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await llm.embed(chunks[i]);
    const bufferEmbedding = Buffer.from(new Float32Array(embedding).buffer);
    insertChunk({ document_id: documentId, chunk_index: i, chunk_text: chunks[i], embedding: bufferEmbedding });
  }

  return { documentId, filename, fileHash, chunks: chunks.length, fullText };
}