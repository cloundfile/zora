import chalk from 'chalk';

export const GREETING = 'Em que posso ajudar?';

export function printStartupLine(model: string, version: string): void {
  console.log(chalk.whiteBright(`zora:${model} version:${version}`));
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