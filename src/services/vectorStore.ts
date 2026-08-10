import type { LLMProvider } from '../llm/types';
import { getDb } from '../models/db';
import type { DocumentChunkRow } from '../models/documentModel';

export interface ChunkMatch {
  chunk_id: string;
  document_id: string;
  chunk_text: string;
  score: number;
}

interface ScoredChunk extends ChunkMatch {
  lexical: number;
}

const COSINE_THRESHOLD = 0.15;
const WORD_RE = /[a-z0-9]+/g;

function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function lexicalScore(queryWords: Set<string>, text: string): number {
  if (queryWords.size === 0) return 0;
  const textWords = new Set(normalizeForSearch(text).match(WORD_RE) ?? []);
  let hits = 0;
  for (const word of queryWords) {
    if (textWords.has(word)) hits++;
  }
  return hits / queryWords.size;
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
  limit = 10,
): Promise<ChunkMatch[]> {
  const queryEmbedding = await llm.embed(query);
  const queryWords = new Set(normalizeForSearch(query).match(WORD_RE) ?? []);
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
      lexical: lexicalScore(queryWords, row.chunk_text),
    } as ScoredChunk;
  });

  const byScore = (a: ScoredChunk, b: ScoredChunk) => b.score - a.score;
  const byLexical = (a: ScoredChunk, b: ScoredChunk) => b.lexical - a.lexical;

  const semantic = scored.filter((m) => m.score > COSINE_THRESHOLD);
  const termHits = scored.filter((m) => m.lexical >= 0.5);

  const ranked: ChunkMatch[] = [];
  const seen = new Set<string>();
  for (const m of termHits.sort(byLexical)) {
    if (!seen.has(m.chunk_id)) {
      seen.add(m.chunk_id);
      ranked.push(m);
    }
  }
  for (const m of semantic.sort(byScore)) {
    if (!seen.has(m.chunk_id)) {
      seen.add(m.chunk_id);
      ranked.push(m);
    }
  }

  if (ranked.length > 0) return ranked.slice(0, limit);

  return scored
    .filter((m) => m.score > 0)
    .sort(byScore)
    .slice(0, Math.min(3, limit));
}

export function buildContext(matches: ChunkMatch[]): string {
  if (matches.length === 0) return '';
  return matches
    .map((m, i) => `[Documento ${i + 1}] ${m.chunk_text}`)
    .join('\n\n');
}