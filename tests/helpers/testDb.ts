import Database from 'better-sqlite3';
import { setDb, closeDb } from '../../src/models/db';
import { SCHEMA } from '../../src/models/schema';
import type { SessionRole } from '../../src/models/schema';

export function setupTestDb(): Database.Database {
  closeDb();
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  setDb(db);
  return db;
}

export function insertMessage(
  db: Database.Database,
  sessionId: string,
  role: SessionRole,
  content: string,
  id?: string,
  messageId = `msg_${Math.random().toString(36).slice(2)}`,
): void {
  db.prepare(
    'INSERT OR REPLACE INTO session_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)',
  ).run(id ?? messageId, sessionId, role, content);
}

export function insertSession(db: Database.Database, id = `s_${Math.random().toString(36).slice(2)}`, title = 'Teste'): string {
  db.prepare('INSERT INTO sessions (id, title) VALUES (?, ?)').run(id, title);
  return id;
}