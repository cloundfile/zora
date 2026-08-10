import { ensureSetup } from '../setup/initSetup';
import { buildAndValidateLlm } from './llmHelper';
import { resolveSession } from '../services/chatService';
import { runChatLoop } from '../views/chatView';
import { printStartupLine } from '../views/output';
import { migrateSchema, loadVectorExtension } from '../models/schema';
import { initDb, getDb } from '../models/db';

const PKG_VERSION = require('../../package.json').version as string;

export async function chatCommand(sessionId?: string): Promise<void> {
  await ensureSetup();

  initDb();
  migrateSchema();
  loadVectorExtension(getDb());

  const llm = await buildAndValidateLlm();

  const activeSessionId = resolveSession(sessionId);
  printStartupLine(llm.model, PKG_VERSION);
  await runChatLoop(llm, activeSessionId);
}