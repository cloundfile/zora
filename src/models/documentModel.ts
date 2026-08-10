import { randomUUID } from 'crypto';
import { getDb } from './db';

export interface DocumentRow {
  id: string;
  filename: string;
  file_hash: string | null;
  mime_type: string;
  full_text: string;
  original_blob: Buffer;
  created_at: string;
}

export interface DocumentChunkRow {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: Buffer;
}

export function insertDocument(
  doc: Omit<DocumentRow, 'id' | 'created_at'>,
): DocumentRow {
  const row = { id: randomUUID(), ...doc };
  getDb()
    .prepare(
      'INSERT INTO documents (id, filename, file_hash, mime_type, full_text, original_blob) VALUES (@id, @filename, @file_hash, @mime_type, @full_text, @original_blob)',
    )
    .run(row);
  return row as DocumentRow;
}

export function getDocumentByHash(hash: string): DocumentRow | undefined {
  return getDb()
    .prepare('SELECT * FROM documents WHERE file_hash = ?')
    .get(hash) as DocumentRow | undefined;
}

export function insertChunk(
  chunk: Omit<DocumentChunkRow, 'id'>,
): DocumentChunkRow {
  const row = { id: randomUUID(), ...chunk };
  getDb()
    .prepare(
      'INSERT INTO document_chunks (id, document_id, chunk_index, chunk_text, embedding) VALUES (@id, @document_id, @chunk_index, @chunk_text, @embedding)',
    )
    .run(row);
  return row as DocumentChunkRow;
}

export function getDocumentCount(): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS total FROM documents')
    .get() as { total: number };
  return row.total;
}

export function getChunkCount(): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS total FROM document_chunks')
    .get() as { total: number };
  return row.total;
}

export function listDocuments(): DocumentRow[] {
  const rows = getDb()
    .prepare('SELECT * FROM documents ORDER BY created_at DESC')
    .all() as unknown as DocumentRow[];
  return rows;
}

export function clearDocuments(): void {
  getDb().prepare('DELETE FROM document_cnpjs').run();
  getDb().prepare('DELETE FROM document_chunks').run();
  getDb().prepare('DELETE FROM documents').run();
}