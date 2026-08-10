import type { LLMProvider } from '../llm/types';
import { getDb } from '../models/db';
import type { DocumentChunkRow } from '../models/documentModel';

export interface ChunkMatch {
  chunk_id: string;
  document_id: string;
  chunk_text: string;
  score: number;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchChunks(
  llm: LLMProvider,
  query: string,
  limit = 5,
): Promise<ChunkMatch[]> {
  const queryEmbedding = await llm.embed(query);
  const rows = getDb()
    .prepare('SELECT * FROM document_chunks')
    .all() as unknown as DocumentChunkRow[];

  const scored = rows.map((row) => {
    let embedding: number[];
    try {
      const buf = row.embedding as Buffer;
      embedding = Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
    } catch {
      embedding = [];
    }
    return {
      chunk_id: row.id,
      document_id: row.document_id,
      chunk_text: row.chunk_text,
      score: cosineSimilarity(queryEmbedding, embedding),
    };
  });

  return scored
    .filter((m) => m.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildContext(matches: ChunkMatch[]): string {
  if (matches.length === 0) return '';
  return matches
    .map((m, i) => `[Documento ${i + 1}] ${m.chunk_text}`)
    .join('\n\n');
}