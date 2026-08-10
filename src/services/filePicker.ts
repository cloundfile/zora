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

function extensionsToFilter(extensions: string[]): string {
  return `Documentos (${extensions.join(' ')} *.${extensions.map((e) => e.slice(1)).join(' *.')})`;
}

export async function pickFile(
  extensions = ['.pdf', '.txt', '.json'],
): Promise<string | null> {
  const files = await pickFiles(extensions);
  return files[0] ?? null;
}

export async function pickFiles(
  extensions = ['.pdf', '.txt', '.json'],
): Promise<string[]> {
  const zenity = await run('zenity', [
    '--file-selection',
    '--multiple',
    '--separator=\n',
    '--file-filter',
    extensionsToFilter(extensions),
  ]);
  if (zenity) return splitPaths(zenity);

  const kdialog = await run('kdialog', ['--getopenfilenames', process.cwd()]);
  if (kdialog) return splitPaths(kdialog);

  return pickFilesFallback(extensions);
}

function splitPaths(output: string): string[] {
  return output
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && fs.existsSync(p));
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

async function pickFilesFallback(extensions: string[]): Promise<string[]> {
  const candidates = fs
    .readdirSync(process.cwd())
    .filter((f) => extensions.includes(path.extname(f).toLowerCase()))
    .sort();

  if (candidates.length === 0) {
    console.log('Nenhum arquivo compatível encontrado na pasta atual.');
    const { manual } = await inquirer.prompt<{ manual: string }>([
      { type: 'input', name: 'manual', message: 'Informe o caminho de um arquivo:' },
    ]);
    return manual && fs.existsSync(manual) ? [manual] : [];
  }

  const { selected } = await inquirer.prompt<{ selected: string[] }>([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Selecione os arquivos (espaço marca/desmarca, enter confirma):',
      choices: candidates,
      pageSize: 12,
    },
  ]);
  return selected ?? [];
}