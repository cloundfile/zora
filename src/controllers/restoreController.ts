import chalk from 'chalk';
import * as fs from 'fs';
import inquirer from 'inquirer';
import { DB_PATH, closeDb, ensureDirs } from '../models/db';
import { pickFile } from '../services/filePicker';
import { ZoraError } from '../errors/zoraErrors';

export async function restoreCommand(): Promise<void> {
  const backupFile = await pickFile(['.db']);
  if (!backupFile) {
    console.log(chalk.yellow('Restauração cancelada.'));
    return;
  }
  if (!fs.existsSync(backupFile)) {
    throw new ZoraError('backup_not_found', `Arquivo ${backupFile} não encontrado.`, true);
  }

  closeDb();
  ensureDirs();
  fs.copyFileSync(backupFile, DB_PATH);
  console.log(chalk.green(`Banco restaurado de ${backupFile}.`));

  const { open } = await inquirer.prompt<{ open: boolean }>([
    {
      type: 'confirm',
      name: 'open',
      message: 'Iniciar o chat agora?',
      default: true,
    },
  ]);
  if (open) {
    const { chatCommand } = await import('./chatController');
    await chatCommand();
  }
}