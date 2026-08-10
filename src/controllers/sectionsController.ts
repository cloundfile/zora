import inquirer from 'inquirer';
import { listSessions } from '../models/sessionModel';
import { printSessionsList } from '../views/menuView';
import { initDb } from '../models/db';
import { migrateSchema } from '../models/schema';
import { chatCommand } from './chatController';

export async function sectionsCommand(): Promise<void> {
  initDb();
  migrateSchema();

  const sessions = listSessions();
  printSessionsList(sessions);

  if (sessions.length === 0) {
    await chatCommand();
    return;
  }

  const { selectedId } = await inquirer.prompt<{ selectedId: string }>([
    {
      type: 'list',
      name: 'selectedId',
      message: 'Selecione uma seção para continuar:',
      choices: sessions.map((s) => ({
        name: `${s.created_at} — ${s.title ?? s.id.slice(0, 8)}`,
        value: s.id,
      })),
      loop: false,
    },
  ]);

  await chatCommand(selectedId);
}