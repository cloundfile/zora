import type Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { initDb } from './db';

export type SessionRole = 'input' | 'output';

export const SCHEMA = `
-- Documentos Originais (com file_hash UNIQUE para deduplicação via SHA-256)
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_hash TEXT UNIQUE,
    mime_type TEXT NOT NULL,
    full_text TEXT NOT NULL,
    original_blob BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chunks Vetorizados (Limite de 500 caracteres)
CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding BLOB NOT NULL,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Base de Dados de Empresas (Receita Federal)
CREATE TABLE IF NOT EXISTS companies (
    cnpj TEXT PRIMARY KEY,
    company_name TEXT,
    trade_name TEXT,
    raw_data JSON,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vínculo Documento <-> CNPJ (chave composta evita links duplicados)
CREATE TABLE IF NOT EXISTS document_cnpjs (
    document_id TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    PRIMARY KEY (document_id, cnpj),
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY(cnpj) REFERENCES companies(cnpj) ON DELETE CASCADE
);

-- Fila de Espera de CNPJ (Offline/Falha de API)
CREATE TABLE IF NOT EXISTS cnpj_queue (
    cnpj TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    last_attempt DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessões do Chat CLI
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Histórico de Mensagens da Sessão
-- role: 'input' (pergunta do usuário) | 'output' (resposta do agente)
CREATE TABLE IF NOT EXISTS session_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('input', 'output')) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
`;

export function migrateSchema(): void {
  const database = initDb();
  database.exec(SCHEMA);
  ensureDocumentsHashColumn(database);
  ensureDocumentCnpjsCompositeKey(database);
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function ensureDocumentsHashColumn(db: Database.Database): void {
  const cols = db.pragma('table_info(documents)') as { name: string }[];
  if (cols.some((c) => c.name === 'file_hash')) return;

  db.exec('ALTER TABLE documents ADD COLUMN file_hash TEXT');

  const rows = db
    .prepare('SELECT id, original_blob FROM documents')
    .all() as { id: string; original_blob: Buffer }[];
  const update = db.prepare('UPDATE documents SET file_hash = ? WHERE id = ?');
  for (const row of rows) {
    update.run(sha256(row.original_blob), row.id);
  }
}

function ensureDocumentCnpjsCompositeKey(db: Database.Database): void {
  const cols = db.pragma('table_info(document_cnpjs)') as { name: string }[];
  if (!cols.some((c) => c.name === 'id')) return;

  db.pragma('foreign_keys = OFF');
  try {
    db.exec(`
      CREATE TABLE document_cnpjs_new (
        document_id TEXT NOT NULL,
        cnpj TEXT NOT NULL,
        PRIMARY KEY (document_id, cnpj),
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY(cnpj) REFERENCES companies(cnpj) ON DELETE CASCADE
      );
      INSERT OR IGNORE INTO document_cnpjs_new (document_id, cnpj)
        SELECT document_id, cnpj FROM document_cnpjs;
      DROP TABLE document_cnpjs;
      ALTER TABLE document_cnpjs_new RENAME TO document_cnpjs;
    `);
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

export function loadVectorExtension(database: Database.Database): void {
  try {
    const sqliteVec = require('sqlite-vec');
    sqliteVec.load(database);
  } catch {
    // extensão de vetores indisponível: embeddings ficam como blob + busca em memória
  }
}