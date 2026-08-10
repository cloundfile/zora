import { randomUUID } from 'crypto';
import { getDb } from './db';

export interface SessionRow {
  id: string;
  title: string | null;
  created_at: string;
}

export function createSession(title?: string): SessionRow {
  const row = {
    id: randomUUID(),
    title: title ?? null,
  };
  getDb()
    .prepare('INSERT INTO sessions (id, title) VALUES (@id, @title)')
    .run(row);
  return row as SessionRow;
}

export function getSessionById(id: string): SessionRow | undefined {
  return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
    | SessionRow
    | undefined;
}

export function getLastSession(): SessionRow | undefined {
  return getDb()
    .prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1')
    .get() as SessionRow | undefined;
}

export function listSessions(): SessionRow[] {
  return getDb()
    .prepare('SELECT * FROM sessions ORDER BY created_at DESC')
    .all() as SessionRow[];
}

export function deleteSession(id: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function clearSessions(): void {
  getDb().prepare('DELETE FROM session_messages').run();
  getDb().prepare('DELETE FROM sessions').run();
}