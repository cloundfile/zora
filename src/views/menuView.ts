import chalk from 'chalk';
import type { SessionRow } from '../models/sessionModel';

export function renderSessionsMenu(sessions: SessionRow[]): string[] {
  return sessions.map((s) => {
    const title = s.title ?? `Sessão ${s.id.slice(0, 8)}`;
    return `${s.id}  ${s.created_at}  ${title}`;
  });
}

export function printSessionsList(sessions: SessionRow[]): void {
  if (sessions.length === 0) {
    console.log(chalk.dim('Nenhuma seção salva. Inicie uma conversa com `zora`.'));
    return;
  }
  console.log(chalk.bold('Seções salvas:'));
  for (const s of sessions) {
    const title = s.title ?? `Sessão ${s.id.slice(0, 8)}`;
    console.log(`${chalk.cyan(s.id)}  ${chalk.dim(s.created_at)}  ${title}`);
  }
}

export function printConfirmKill(): void {
  console.log(chalk.bold.redBright('⚠  AÇÃO IRREVOGÁVEL  ⚠'));
  console.log(
    chalk.red('Esta ação apaga TODAS as tabelas do banco e TODOS os arquivos de backup.'),
  );
  console.log(
    chalk.red('Os dados só poderão ser restaurados se você possuir um backup externo.'),
  );
}

export function printHelp(): void {
  console.log(chalk.magentaBright.bold('Zora — seu assistente pessoal'));
  console.log('');
  console.log('Comandos:');
  console.log('  zora                     Inicia ou retoma a sessão de chat (RAG)');
  console.log('  zora sections            Lista e retoma uma sessão existente');
  console.log('  zora reset               Limpa o histórico de conversas');
  console.log('  zora delete <id>         Elimina a seção <id> e inicia nova sessão');
  console.log('  zora kill                Purga dados (exige confirmação CONFIRMAR)');
  console.log('  zora treinamentos        Abre seletor de arquivos e treina (.pdf/.txt/.json)');
  console.log('  zora exportar            Exporta o banco SQLite (.db)');
  console.log('  zora restore             Restaura um banco .db');
  console.log('  zora config              Altera provedor, API key e modelo');
  console.log('  zora version | -v        Mostra versão, autor, licença e SO');
  console.log('  zora help                Mostra esta ajuda');
  console.log('');
  console.log('Exemplos:');
  console.log('  zora');
  console.log('  zora treinamentos');
  console.log('  zora delete 3f2a9c1e-....');
}