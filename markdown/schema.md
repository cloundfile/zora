-- Documentos Originais
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
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

-- Vínculo Documento <-> CNPJ
CREATE TABLE IF NOT EXISTS document_cnpjs (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    FOREIGN KEY(document_id) REFERENCES documents(id),
    FOREIGN KEY(cnpj) REFERENCES companies(cnpj)
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
CREATE TABLE IF NOT EXISTS session_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('question', 'answer')) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);