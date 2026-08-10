import chalk from 'chalk';
import { ZoraError } from '../errors/zoraErrors';

export function handleError(error: unknown): number {
  if (error instanceof ZoraError) {
    if (error.fatal) {
      console.error(chalk.red(`✖ ${error.message}`));
      return 1;
    }
    console.warn(chalk.yellow(`⚠ ${error.message}`));
    return 0;
  }
  if (error instanceof Error) {
    console.error(chalk.red(`✖ Erro inesperado: ${error.message}`));
  } else {
    console.error(chalk.red('✖ Erro inesperado.'));
  }
  return 1;
}