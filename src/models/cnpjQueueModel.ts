import { getDb } from './db';

export interface CnpjQueueRow {
  cnpj: string;
  attempts: number;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  last_attempt: string | null;
  created_at: string;
}

export function enqueueCnpj(cnpj: string): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO cnpj_queue (cnpj, status) VALUES (?, ?)')
    .run(cnpj, 'PENDING');
}

export function getPendingCnpjs(): CnpjQueueRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM cnpj_queue WHERE status IN ('PENDING', 'FAILED') AND attempts < 5 ORDER BY created_at ASC",
    )
    .all() as CnpjQueueRow[];
}

export function markCnpjDone(cnpj: string, rawData: unknown): void {
  const { upsertCompany } = require('./companyModel');
  upsertCompany(cnpj, { raw_data: rawData, company_name: extractName(rawData) });
  getDb()
    .prepare("UPDATE cnpj_queue SET status = 'DONE', last_attempt = CURRENT_TIMESTAMP WHERE cnpj = ?")
    .run(cnpj);
}

export function markCnpjFailed(cnpj: string): void {
  getDb()
    .prepare(
      "UPDATE cnpj_queue SET attempts = attempts + 1, status = 'FAILED', last_attempt = CURRENT_TIMESTAMP WHERE cnpj = ?",
    )
    .run(cnpj);
}

function extractName(rawData: unknown): string | null {
  if (rawData && typeof rawData === 'object') {
    const rec = rawData as Record<string, unknown>;
    return (rec.nome as string) ?? (rec.razao_social as string) ?? null;
  }
  return null;
}