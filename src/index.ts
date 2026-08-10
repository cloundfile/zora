#!/usr/bin/env node
import { Command } from 'commander';
import { chatCommand } from './controllers/chatController';
import { sectionsCommand } from './controllers/sectionsController';
import { resetCommand } from './controllers/resetController';
import { deleteCommand } from './controllers/deleteController';
import { killCommand } from './controllers/killController';
import { trainCommand } from './controllers/trainController';
import { exportCommand } from './controllers/exportController';
import { restoreCommand } from './controllers/restoreController';
import { configCommand } from './controllers/configController';
import { versionCommand } from './controllers/versionController';
import { helpCommand } from './controllers/helpController';
import { handleError } from './utils/errorHandler';
import { checkVersion } from './setup/versionCheck';

const PKG_VERSION = require('../package.json').version as string;

async function start(): Promise<void> {
  await checkVersion();
}

const program = new Command();

program
  .name('zora')
  .description('Zora, seu assistente pessoal')
  .version(PKG_VERSION, '-v, --version', 'Mostra a versão do Zora')
  .helpOption('-h, --help', 'Mostra esta ajuda');

async function runAction(action: () => Promise<void>): Promise<void> {
  try {
    await start();
    await action();
  } catch (error) {
    process.exitCode = handleError(error);
  }
}

program.command('sections').description('Lista as seções salvas e permite continuar uma conversa')
  .action(() => runAction(() => sectionsCommand()));

program.command('reset').description('Limpa o histórico de conversas e inicia sessão limpa')
  .action(() => runAction(() => resetCommand()));

program.command('delete <id>').description('Elimina permanentemente a seção <id> e inicia nova sessão')
  .action((id: string) => runAction(() => deleteCommand(id)));

program.command('kill').description('Purga TODOS os dados e backups (requer confirmação CONFIRMAR)')
  .action(() => runAction(() => killCommand()));

program.command('treinamentos').description('Abre seletor de arquivos (.pdf/.txt/.json) e treina o RAG')
  .action(() => runAction(() => trainCommand()));

program.command('exportar').description('Exporta uma cópia do banco SQLite (.db)')
  .action(() => runAction(() => exportCommand()));

program.command('restore').description('Restaura a base de dados a partir de um arquivo .db')
  .action(() => runAction(() => restoreCommand()));

program.command('config').description('Menu interativo para alternar provedor, API key e modelo')
  .action(() => runAction(() => configCommand()));

program.command('version').description('Mostra versão, autor, licença e dados do SO/Node.js')
  .action(() => runAction(() => Promise.resolve(versionCommand())));

program.helpCommand(false);
program.command('help', { isDefault: false }).description('Exibe o menu de ajuda')
  .action(() => runAction(() => Promise.resolve(helpCommand())));

program.action(() => runAction(() => chatCommand()));

void program.parseAsync(process.argv);