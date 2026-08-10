import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { setupTestDb, insertSession, insertMessage } from '../helpers/testDb';
import { clearSessions, listSessions } from '../../src/models/sessionModel';

describe('reset integration', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupTestDb();
  });

  it('limpa sessões e mensagens mas preserva as tabelas', () => {
    const s1 = insertSession(db, 's1', 'Sessão 1');
    const s2 = insertSession(db, 's2', 'Sessão 2');
    insertMessage(db, s1, 'input', 'olá');
    insertMessage(db, s2, 'output', 'oi');

    clearSessions();

    expect(listSessions()).toHaveLength(0);
    const count = db.prepare('SELECT COUNT(*) AS n FROM session_messages').get() as { n: number };
    expect(count.n).toBe(0);
    const sessions = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();
    expect(sessions).toBeTruthy();
  });
});