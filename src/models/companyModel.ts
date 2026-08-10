import { getDb } from './db';

export interface CompanyRow {
  cnpj: string;
  company_name: string | null;
  trade_name: string | null;
  raw_data: unknown;
  updated_at: string;
}

export function upsertCompany(cnpj: string, data: Partial<CompanyRow>): void {
  getDb()
    .prepare(
      `INSERT INTO companies (cnpj, company_name, trade_name, raw_data, updated_at)
       VALUES (@cnpj, @company_name, @trade_name, @raw_data, CURRENT_TIMESTAMP)
       ON CONFLICT(cnpj) DO UPDATE SET
         company_name = excluded.company_name,
         trade_name = excluded.trade_name,
         raw_data = excluded.raw_data,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .run({
      cnpj,
      company_name: data.company_name ?? null,
      trade_name: data.trade_name ?? null,
      raw_data: data.raw_data
        ? JSON.stringify(data.raw_data)
        : null,
    });
}

export function getCompany(cnpj: string): CompanyRow | undefined {
  return getDb().prepare('SELECT * FROM companies WHERE cnpj = ?').get(cnpj) as
    | CompanyRow
    | undefined;
}

export function linkDocumentToCnpj(
  documentId: string,
  cnpj: string,
): void {
  getDb()
    .prepare(
      'INSERT OR IGNORE INTO document_cnpjs (document_id, cnpj) VALUES (?, ?)',
    )
    .run(documentId, cnpj);
}

export function getCompaniesByDocument(documentId: string): CompanyRow[] {
  return getDb()
    .prepare(
      `SELECT c.* FROM companies c
       JOIN document_cnpjs dc ON dc.cnpj = c.cnpj
       WHERE dc.document_id = ?`,
    )
    .all(documentId) as CompanyRow[];
}