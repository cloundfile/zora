import chalk from 'chalk';
import { initDb } from '../models/db';
import { DB_PATH } from '../models/db';
import { pickSaveFile } from '../services/filePicker';
import { backupDatabaseTo } from '../services/backupService';
import { ZoraError } from '../errors/zoraErrors';

export async function exportCommand(): Promise<void> {
  initDb();
  if (!DB_PATH) throw new ZoraError('no_db', 'Nenhum banco de dados para exportar.', true);

  const target = await pickSaveFile('zora_export.db');
  if (!target) {
    console.log(chalk.yellow('Exportação cancelada.'));
    return;
  }

  backupDatabaseTo(target);
  console.log(chalk.green(`Banco de dados exportado para ${target}`));
}