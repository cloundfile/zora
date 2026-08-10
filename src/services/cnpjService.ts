import chalk from 'chalk';
import { enqueueCnpj, getPendingCnpjs, markCnpjDone, markCnpjFailed } from '../models/cnpjQueueModel';
import { getCompany, upsertCompany, linkDocumentToCnpj } from '../models/companyModel';

// Padrão misto da Receita Federal: numérico OU alfanumérico (2026)
const CNPJ_PATTERN =
  /\b([A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/\d{4}-\d{2})\b|\b([A-Z0-9]{14})\b/g;

export function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export function isAlphanumericCnpj(cnpj: string): boolean {
  return /[A-Z]/i.test(cnpj);
}

export function findCnpjs(text: string): string[] {
  const matches = text.match(CNPJ_PATTERN) ?? [];
  return [...new Set(matches.map(normalizeCnpj))];
}

export function formatCnpj(cnpj: string): string {
  const n = normalizeCnpj(cnpj);
  if (n.length !== 14) return cnpj;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12, 14)}`;
}

export function alphanumericCnpjWarning(cnpj: string): string {
  return chalk.yellow(
    `⚠️ O CNPJ "${formatCnpj(cnpj)}" utiliza o novo formato Alfanumérico. ` +
    'Consultas para este padrão ainda não estão disponíveis/estabilizadas nas APIs gratuitas da Receita Federal.',
  );
}

export function hasCnpj(cnpj: string): void {
  const normalized = normalizeCnpj(cnpj);
  if (!getCompany(normalized)) {
    enqueueCnpj(normalized);
  }
}

export async function processCnpjQueue(): Promise<number> {
  const pending = getPendingCnpjs();
  let processed = 0;
  for (const item of pending) {
    const data = await fetchCnpjFromReceita(item.cnpj);
    if (data) {
      markCnpjDone(item.cnpj, data);
    } else {
      markCnpjFailed(item.cnpj);
    }
    processed++;
  }
  return processed;
}

export async function lookupCnpj(cnpj: string): Promise<unknown> {
  const normalized = normalizeCnpj(cnpj);
  const local = getCompany(normalized);
  if (local && local.raw_data) return local.raw_data;

  if (isAlphanumericCnpj(normalized)) {
    console.log(alphanumericCnpjWarning(normalized));
    enqueueCnpj(normalized);
    return null;
  }

  const data = await fetchCnpjFromReceita(normalized);
  if (data) {
    upsertCompany(normalized, {
      raw_data: data,
      company_name: (data as Record<string, unknown>).razao_social as string,
    });
    return data;
  }

  enqueueCnpj(normalized);
  return null;
}

export async function fetchCnpjFromReceita(cnpj: string): Promise<unknown | null> {
  const url = `https://www.receitaws.com.br/v1/cnpj/${cnpj}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: string };
    if (json.status === 'ERROR') return null;
    return json;
  } catch {
    return null;
  }
}

export function linkFoundCnpjs(documentId: string, cnpjs: string[]): void {
  for (const cnpj of cnpjs) {
    linkDocumentToCnpj(documentId, cnpj);
  }
}