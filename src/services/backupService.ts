import * as fs from 'fs';
import * as path from 'path';
import { DB_PATH, ROOT_DIR } from '../models/db';

export function getBackupDir(kind: 'daily' | 'monthly' = 'daily'): string {
  return path.join(ROOT_DIR, 'backups', kind);
}

function stamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}h${pad(date.getMinutes())}m`
  );
}

export async function createBackups(): Promise<string[]> {
  if (!fs.existsSync(DB_PATH)) return [];
  const source = fs.readFileSync(DB_PATH);
  const now = new Date();
  const dailyDir = getBackupDir('daily');
  const monthlyDir = getBackupDir('monthly');
  fs.mkdirSync(dailyDir, { recursive: true });
  fs.mkdirSync(monthlyDir, { recursive: true });

  const dailyFile = path.join(dailyDir, `zora_backup_${stamp(now)}.db`);
  fs.writeFileSync(dailyFile, source);

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyFile = path.join(monthlyDir, `zora_backup_${monthKey}.db`);
  if (!fs.existsSync(monthlyFile)) {
    fs.writeFileSync(monthlyFile, source);
  }

  pruneOldBackups(dailyDir, 7);
  return [dailyFile, monthlyFile];
}

function pruneOldBackups(dir: string, keep: number): void {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const old of files.slice(keep)) {
    fs.unlinkSync(path.join(dir, old.f));
  }
}

export function backupDatabaseTo(filepath: string): void {
  if (!fs.existsSync(DB_PATH)) throw new Error('Nenhum banco de dados para backup.');
  fs.copyFileSync(DB_PATH, filepath);
}

export function wipeAllBackups(): void {
  for (const kind of ['daily', 'monthly'] as const) {
    const dir = getBackupDir(kind);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      fs.unlinkSync(path.join(dir, f));
    }
  }
}