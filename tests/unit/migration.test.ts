import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { setDb, closeDb } from '../../src/models/db';
import { migrateSchema, sha256 } from '../../src/models/schema';

describe('migração de schema legado', () => {
  let db: Database.Database;

  beforeEach(() => {
    closeDb();
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
  });

  afterEach(() => {
    closeDb();
  });

  it('adiciona file_hash em documentos legados sem a coluna', () => {
    db.exec(`
      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        full_text TEXT NOT NULL,
        original_blob BLOB NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding BLOB NOT NULL
      );
      CREATE TABLE companies (
        cnpj TEXT PRIMARY KEY,
        company_name TEXT,
        trade_name TEXT,
        raw_data JSON,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE document_cnpjs (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        cnpj TEXT NOT NULL
      );
      CREATE TABLE cnpj_queue (
        cnpj TEXT PRIMARY KEY,
        attempts INTEGER DEFAULT 0,
        status TEXT DEFAULT 'PENDING',
        last_attempt DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE session_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT CHECK(role IN ('question', 'answer')) NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO documents (id, filename, mime_type, full_text, original_blob)
        VALUES ('d1', 'legado.txt', 'text/plain', 'olá', X'6F6C61');
      INSERT INTO document_cnpjs (id, document_id, cnpj) VALUES ('l1', 'd1', '12345678000195');
    `);

    setDb(db);
    migrateSchema();

    const cols = db.pragma('table_info(documents)') as { name: string }[];
    expect(cols.some((c) => c.name === 'file_hash')).toBe(true);

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get('d1') as {
      file_hash: string | null;
    };
    expect(doc.file_hash).toBe(sha256(Buffer.from([0x6f, 0x6c, 0x61])));

    const linkCols = db.pragma('table_info(document_cnpjs)') as { name: string }[];
    expect(linkCols.some((c) => c.name === 'id')).toBe(false);
    const links = db.prepare('SELECT * FROM document_cnpjs').all();
    expect(links).toHaveLength(1);
  });
});