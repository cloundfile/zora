import * as fs from 'fs';
import * as path from 'path';
import { insertDocument, insertChunk, getDocumentByHash } from '../models/documentModel';
import { sha256 } from '../models/schema';
import type { LLMProvider } from '../llm/types';
import { findCnpjs } from './cnpjService';
import { ZoraError } from '../errors/zoraErrors';

const CHUNK_SIZE = 500;

export interface IngestResult {
  documentId: string;
  filename: string;
  fileHash: string;
  chunks: number;
  cnpjs: string[];
  duplicate?: boolean;
}

export function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractPdfText(buffer);
  }
  return Promise.resolve(buffer.toString('utf-8'));
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');
    const res = await pdfParse(buffer);
    return res.text ?? '';
  } catch (error) {
    throw new ZoraError('pdf_parse_failed', `Falha ao ler PDF: ${(error as Error).message}`);
  }
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
    return { documentId: existing.id, filename, fileHash, chunks: 0, cnpjs: [], duplicate: true };
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

  const chunks = splitIntoChunks(fullText);
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await llm.embed(chunks[i]);
    const bufferEmbedding = Buffer.from(new Float32Array(embedding).buffer);
    insertChunk({ document_id: documentId, chunk_index: i, chunk_text: chunks[i], embedding: bufferEmbedding });
  }

  const cnpjs = findCnpjs(fullText);

  return { documentId, filename, fileHash, chunks: chunks.length, cnpjs };
}