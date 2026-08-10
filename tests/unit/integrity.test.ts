import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { setupTestDb } from '../helpers/testDb';
import { sha256 } from '../../src/models/schema';
import { insertDocument, getDocumentByHash, getDocumentCount } from '../../src/models/documentModel';
import { linkDocumentToCnpj, upsertCompany } from '../../src/models/companyModel';
import { extrairCnpjs, formatarCnpj, limparCnpj } from '../../src/services/cnpjService';
import { createLLM } from '../../src/llm/llmFactory';
import { OllamaProvider } from '../../src/llm/providers/ollamaProvider';
import { searchChunks } from '../../src/services/vectorStore';
import type { LLMProvider } from '../../src/llm/types';

describe('update.md — deduplicação e integridade', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupTestDb();
  });

  describe('file_hash (SHA-256)', () => {
    it('gera hash determinístico para o mesmo buffer', () => {
      const a = sha256(Buffer.from('conteúdo repetido'));
      const b = sha256(Buffer.from('conteúdo repetido'));
      expect(a).toBe(b);
      expect(a).toHaveLength(64);
    });

    it('evita duplicar documento já treinado pelo hash', () => {
      const doc = insertDocument({
        filename: 'duplicado.txt',
        file_hash: sha256(Buffer.from('x')),
        mime_type: 'text/plain',
        full_text: 'x',
        original_blob: Buffer.from('x'),
      });
      const found = getDocumentByHash(doc.file_hash!);
      expect(found?.id).toBe(doc.id);
      insertDocument({
        filename: 'outro.txt',
        file_hash: 'hash-diferente',
        mime_type: 'text/plain',
        full_text: 'y',
        original_blob: Buffer.from('y'),
      });
      expect(getDocumentCount()).toBe(2);
    });
  });

  describe('chave composta em document_cnpjs', () => {
    it('não cria vínculo duplicado documento-CNPJ', () => {
      const doc = insertDocument({
        filename: 'a.txt',
        file_hash: 'h1',
        mime_type: 'text/plain',
        full_text: 'CNPJ 12.345.678/0001-95',
        original_blob: Buffer.from('b'),
      });
      upsertCompany('12345678000195', { company_name: 'Empresa Teste' });
      linkDocumentToCnpj(doc.id, '12345678000195');
      linkDocumentToCnpj(doc.id, '12345678000195');
      const count = db
        .prepare('SELECT COUNT(*) AS n FROM document_cnpjs')
        .get() as { n: number };
      expect(count.n).toBe(1);
    });
  });

  describe('dois modelos (chat + embeddings) separados', () => {
    it('usua modelo de embeddings dedicado por padrão', () => {
      const llm = createLLM({ provider: 'ollama', model: 'gemma4' }) as OllamaProvider;
      expect(llm.embedModel).toBe('nomic-embed-text');
      expect(llm.model).toBe('gemma4');
      expect(llm.embedModel).not.toBe(llm.model);
    });

    it('aceita embedModel explícito', () => {
      const llm = createLLM({
        provider: 'ollama',
        model: 'mistral',
        embedModel: 'bge-m3',
      }) as OllamaProvider;
      expect(llm.embedModel).toBe('bge-m3');
      expect(llm.model).toBe('mistral');
    });
  });

  describe('CNPJ tradicional (numérico)', () => {
    it('reconhece e normaliza CNPJs tradicionais', () => {
      const cnpjs = extrairCnpjs('Empresa 03.584.427/0001-72 registrada com CNPJ 03584427000172.');
      expect(cnpjs).toContain('03584427000172');
      expect(limparCnpj('03.584.427/0001-72')).toBe('03584427000172');
      expect(formatarCnpj('03584427000172')).toBe('03.584.427/0001-72');
    });

    it('não reconhece CNPJs alfanuméricos', () => {
      const cnpjs = extrairCnpjs('Empresa AB.CDE.FGH/0001-95 registrada.');
      expect(cnpjs).toEqual([]);
      expect(limparCnpj('ab.cde.fgh/0001-95')).toBe('000195');
    });
  });

  describe('busca vetorial com fallback lexical', () => {
    it('encontra chunk por semelhança lexical quando o cosseno fica baixo', async () => {
      insertDocument({
        filename: 'entidade.txt',
        file_hash: sha256(Buffer.from('entidade')),
        mime_type: 'text/plain',
        full_text:
          'Associação Tradicionalista União Gaúcha realiza eventos culturais no município.',
        original_blob: Buffer.from('entidade'),
      });

      const chunkEmbedding = Buffer.from(new Float32Array([0, 1]).buffer);
      db.prepare(
        `INSERT INTO document_chunks (id, document_id, chunk_index, chunk_text, embedding)
         VALUES (?, (SELECT id FROM documents LIMIT 1), 0, ?, ?)`,
      ).run('c1', 'Associação Tradicionalista União Gaúcha realiza eventos culturais.', chunkEmbedding);

      const llm = {
        embed: async () => [1, 0],
      } as unknown as LLMProvider;

      const matches = await searchChunks(llm, 'Associação Tradicionalista União Gaúcha');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].chunk_text).toContain('Associação Tradicionalista');
    });
  });
});