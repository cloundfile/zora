import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import inquirer from 'inquirer';
import * as fs from 'fs';
import { killCommand } from '../../src/controllers/killController';
import { initDb, closeDb, DB_PATH } from '../../src/models/db';

describe('kill integration', () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    closeDb();
    fs.mkdirSync(require('path').dirname(DB_PATH), { recursive: true });
    initDb(); // garante arquivo de banco existente para o teste
  });

  afterEach(() => {
    vi.restoreAllMocks();
    closeDb();
  });

  it('cancela a operação sem purgar dados quando a confirmação não é CONFIRMAR', async () => {
    vi.spyOn(inquirer, 'prompt').mockResolvedValue({ confirm: 'não' } as never);
    await killCommand();
    expect(logs.some((l) => l.includes('Operação cancelada'))).toBe(true);
    expect(fs.existsSync(DB_PATH)).toBe(true);
  });

  it('exige a confirmação textual CONFIRMAR para purgar', async () => {
    vi.spyOn(inquirer, 'prompt').mockResolvedValue({ confirm: 'CONFIRMAR' } as never);
    await killCommand();
    expect(fs.existsSync(DB_PATH)).toBe(false);
    expect(fs.existsSync(DB_PATH + '-wal')).toBe(false);
  });
});