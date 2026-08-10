import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';

const execFileAsync = promisify(execFile);

async function run(cmd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: 60000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function pickFile(
  extensions = ['.pdf', '.txt', '.json'],
): Promise<string | null> {
  const zenity = await run('zenity', [
    '--file-selection',
    '--file-filter',
    `Documentos (${extensions.join(' ')} *.${extensions.map((e) => e.slice(1)).join(' *.')})`,
  ]);
  if (zenity) return zenity;

  const kdialog = await run('kdialog', ['--getopenfilename', process.cwd()]);
  if (kdialog) return kdialog;

  return pickFileFallback(extensions);
}

export async function pickSaveFile(defaultName = 'zora.db'): Promise<string | null> {
  const zenity = await run('zenity', [
    '--file-selection',
    '--save',
    '--filename',
    defaultName,
  ]);
  if (zenity) return zenity;

  const kdialog = await run('kdialog', [
    '--getsavefilename',
    path.join(process.cwd(), defaultName),
  ]);
  if (kdialog) return kdialog;

  const { target } = await inquirer.prompt<{ target: string }>([
    {
      type: 'input',
      name: 'target',
      message: 'Caminho para salvar:',
      default: path.join(process.cwd(), defaultName),
    },
  ]);
  return target || null;
}

async function pickFileFallback(extensions: string[]): Promise<string | null> {
  const candidates = fs
    .readdirSync(process.cwd())
    .filter((f) => extensions.includes(path.extname(f).toLowerCase()))
    .sort();

  if (candidates.length === 0) {
    console.log('Nenhum arquivo compatível encontrado na pasta atual.');
    const { manual } = await inquirer.prompt<{ manual: string }>([
      { type: 'input', name: 'manual', message: 'Informe o caminho do arquivo:' },
    ]);
    return manual && fs.existsSync(manual) ? manual : null;
  }

  const { selected } = await inquirer.prompt<{ selected: string }>([
    {
      type: 'list',
      name: 'selected',
      message: 'Selecione o arquivo:',
      choices: candidates,
    },
  ]);
  return selected || null;
}