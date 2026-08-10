import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { setupTestDb, insertSession, insertMessage } from '../helpers/testDb';
import { deleteSession, getSessionById, listSessions } from '../../src/models/sessionModel';

describe('delete integration', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupTestDb();
  });

  it('exclui a seção e remove as mensagens associadas (ON DELETE CASCADE)', () => {
    const keep = insertSession(db, 'keep', 'Manter');
    const doomed = insertSession(db, 'doomed', 'Excluir');
    insertMessage(db, keep, 'input', 'mensagem mantida');
    insertMessage(db, doomed, 'input', 'será removida');
    insertMessage(db, doomed, 'output', 'também será removida');

    deleteSession(doomed);

    expect(getSessionById(doomed)).toBeUndefined();
    expect(listSessions().map((s) => s.id)).toEqual(['keep']);

    const rows = db
      .prepare('SELECT * FROM session_messages WHERE session_id = ?')
      .all(doomed);
    expect(rows).toHaveLength(0);

    const kept = db
      .prepare('SELECT * FROM session_messages WHERE session_id = ?')
      .all(keep);
    expect(kept).toHaveLength(1);
  });
});