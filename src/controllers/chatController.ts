import { ensureSetup } from '../setup/initSetup';
import { buildAndValidateLlm } from './llmHelper';
import { resolveSession } from '../services/chatService';
import { runChatLoop } from '../views/chatView';
import { printBanner } from '../views/output';
import { migrateSchema, loadVectorExtension } from '../models/schema';
import { initDb, getDb } from '../models/db';

export async function chatCommand(sessionId?: string): Promise<void> {
  await ensureSetup();

  initDb();
  migrateSchema();
  loadVectorExtension(getDb());

  const llm = await buildAndValidateLlm();

  const activeSessionId = resolveSession(sessionId);
  printBanner();
  await runChatLoop(llm, activeSessionId);
}