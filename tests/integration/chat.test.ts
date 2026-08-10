import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { setupTestDb, insertSession, insertMessage } from '../helpers/testDb';
import { addMessage, getMessagesBySession, getRecentMessages } from '../../src/models/messageModel';
import { createSession, getLastSession, getSessionById } from '../../src/models/sessionModel';

describe('chat integration', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupTestDb();
  });

  it('grava turnos como input (pergunta) e output (resposta do agente)', () => {
    const sessionId = createSession('Integração').id;
    addMessage(sessionId, 'input', 'Qual o prazo?');
    addMessage(sessionId, 'output', 'Conforme o contrato, 30 dias.');

    const messages = getMessagesBySession(sessionId);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('input');
    expect(messages[1].role).toBe('output');
    expect(messages[0].content).toBe('Qual o prazo?');
  });

  it('rejeita roles fora de input/output (CHECK constraint)', () => {
    const sessionId = insertSession(db);
    expect(() =>
      db
        .prepare(
          "INSERT INTO session_messages (id, session_id, role, content) VALUES ('m1', ?, 'question', 'x')",
        )
        .run(sessionId),
    ).toThrow();
    expect(() =>
      db
        .prepare(
          "INSERT INTO session_messages (id, session_id, role, content) VALUES ('m2', ?, 'answer', 'x')",
        )
        .run(sessionId),
    ).toThrow();
  });

  it('resolve a última sessão criada como sessão ativa', () => {
    insertMessage(db, insertSession(db, 's1'), 'input', 'primeira');
    const active = getLastSession();
    expect(active).toBeTruthy();
    expect(getSessionById(active!.id)?.id).toBe(active!.id);
  });

  it('getRecentMessages preserva a ordem cronológica e limita a quantidade', () => {
    const sessionId = createSession('Histórico').id;
    for (let i = 0; i < 5; i++) {
      addMessage(sessionId, 'input', `p${i}`);
      addMessage(sessionId, 'output', `r${i}`);
    }
    const recent = getRecentMessages(sessionId, 4);
    expect(recent).toHaveLength(4);
    expect(recent[0].content).toBe('p3');
    expect(recent[recent.length - 1].content).toBe('r4');
  });
});