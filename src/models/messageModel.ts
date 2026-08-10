import { randomUUID } from 'crypto';
import { getDb } from './db';
import type { SessionRole } from './schema';

export interface SessionMessageRow {
  id: string;
  session_id: string;
  role: SessionRole;
  content: string;
  created_at: string;
}

export function addMessage(
  sessionId: string,
  role: SessionRole,
  content: string,
): SessionMessageRow {
  const row = {
    id: randomUUID(),
    session_id: sessionId,
    role,
    content,
  };
  getDb()
    .prepare(
      'INSERT INTO session_messages (id, session_id, role, content) VALUES (@id, @session_id, @role, @content)',
    )
    .run(row);
  return row as SessionMessageRow;
}

export function getMessagesBySession(sessionId: string): SessionMessageRow[] {
  return getDb()
    .prepare(
      'SELECT * FROM session_messages WHERE session_id = ? ORDER BY created_at ASC, rowid ASC',
    )
    .all(sessionId) as SessionMessageRow[];
}

export function getLastMessage(
  sessionId: string,
): SessionMessageRow | undefined {
  return getDb()
    .prepare(
      'SELECT * FROM session_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(sessionId) as SessionMessageRow | undefined;
}

export function getRecentMessages(
  sessionId: string,
  limit = 20,
): SessionMessageRow[] {
  return getDb()
    .prepare(
      'SELECT * FROM session_messages WHERE session_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?',
    )
    .all(sessionId, limit)
    .reverse() as SessionMessageRow[];
}