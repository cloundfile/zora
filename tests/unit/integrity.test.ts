import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { setupTestDb } from '../helpers/testDb';
import { sha256 } from '../../src/models/schema';
import { insertDocument, getDocumentByHash, getDocumentCount } from '../../src/models/documentModel';
import { linkDocumentToCnpj, upsertCompany } from '../../src/models/companyModel';
import { findCnpjs, normalizeCnpj, isAlphanumericCnpj, alphanumericCnpjWarning } from '../../src/services/cnpjService';
import { createLLM } from '../../src/llm/llmFactory';
import { OllamaProvider } from '../../src/llm/providers/ollamaProvider';

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

  describe('CNPJ alfanumérico (2026)', () => {
    it('reconhece e normaliza CNPJs alfanuméricos', () => {
      const cnpjs = findCnpjs('Empresa AB.CDE.FGH/0001-95 registrada.');
      expect(cnpjs).toContain('ABCDEFGH000195');
      expect(isAlphanumericCnpj('ABCDEFGH000195')).toBe(true);
      expect(isAlphanumericCnpj('12345678000195')).toBe(false);
      expect(normalizeCnpj('ab.cde.fgh/0001-95')).toBe('ABCDEFGH000195');
    });

    it('gera aviso amigável para CNPJ alfanumérico', () => {
      const warning = alphanumericCnpjWarning('ABCDEFGH000195');
      expect(warning).toContain('formato Alfanumérico');
      expect(warning).toContain('AB.CDE.FGH/0001-95');
    });
  });
});