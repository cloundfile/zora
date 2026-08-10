import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { DB_PATH, closeDb, initDb } from '../models/db';
import { wipeAllBackups } from '../services/backupService';
import { printConfirmKill } from '../views/menuView';

export async function killCommand(): Promise<void> {
  printConfirmKill();

  const { confirm } = await inquirer.prompt<{ confirm: string }>([
    {
      type: 'input',
      name: 'confirm',
      message: 'Digite CONFIRMAR para prosseguir (qualquer outra coisa cancela):',
    },
  ]);

  if (confirm.trim() !== 'CONFIRMAR') {
    console.log(chalk.yellow('Operação cancelada. Nenhum dado foi apagado.'));
    return;
  }

  initDb();
  closeDb();

  for (const suffix of ['', '-wal', '-shm']) {
    const file = DB_PATH + suffix;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  wipeAllBackups();

  console.log(chalk.green('Todos os dados e backups foram purgados.'));
}