import chalk from 'chalk';
import { deleteSession, getSessionById } from '../models/sessionModel';
import { initDb } from '../models/db';
import { chatCommand } from './chatController';
import { ZoraError } from '../errors/zoraErrors';

export async function deleteCommand(id: string): Promise<void> {
  initDb();
  const session = getSessionById(id);
  if (!session) {
    throw new ZoraError('session_not_found', `Seção ${id} não encontrada.`, true);
  }
  deleteSession(id);
  console.log(chalk.green(`Seção ${id} excluída permanentemente.`));
  console.log(chalk.dim('Iniciando nova sessão limpa...'));
  await chatCommand();
}