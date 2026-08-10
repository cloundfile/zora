import chalk from 'chalk';

export const GREETING = 'Em que posso ajudar?';

export function printBanner(): void {
  console.log(chalk.magentaBright('┌──────────────────────────────┐'));
  console.log(chalk.magentaBright('│  ' + chalk.bold('Zora') + ' — seu assistente pessoal │'));
  console.log(chalk.magentaBright('└──────────────────────────────┘'));
}

export function printGreeting(sessionTitle?: string): void {
  if (sessionTitle) {
    console.log(chalk.cyan(`Seção: ${sessionTitle}`));
  }
  console.log(chalk.green(`\n${GREETING}\n`));
}

export function printUserMessage(content: string): void {
  console.log(chalk.whiteBright(`Você: ${content}`));
}

export function printAgentMessage(content: string): void {
  console.log(chalk.cyanBright(`Zora: ${content}\n`));
}

export function printProcessing(): void {
  process.stdout.write(chalk.dim('Zora está pensando...'));
}

export function clearProcessing(): void {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
}