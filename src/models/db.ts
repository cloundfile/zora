import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export const ROOT_DIR =
  process.env.ZORA_ROOT ??
  path.join(os.homedir(), '.zora');

export const DB_PATH = path.join(ROOT_DIR, 'zora.db');

let db: Database.Database | null = null;

export function ensureDirs(): void {
  fs.mkdirSync(ROOT_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT_DIR, 'backups', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(ROOT_DIR, 'backups', 'monthly'), { recursive: true });
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Banco de dados não inicializado. Execute initDb() primeiro.');
  return db;
}

export function initDb(dbPath: string = DB_PATH): Database.Database {
  ensureDirs();
  if (db) return db;
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function setDb(instance: Database.Database): void {
  db = instance;
}