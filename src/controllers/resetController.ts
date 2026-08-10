import chalk from 'chalk';
import { clearSessions } from '../models/sessionModel';
import { initDb } from '../models/db';
import { chatCommand } from './chatController';

export async function resetCommand(): Promise<void> {
  initDb();
  clearSessions();
  console.log(chalk.green('Histórico de conversas limpo. Iniciando nova sessão...'));
  await chatCommand();
}