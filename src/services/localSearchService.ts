import { getDb } from '../models/db';
import { cnpjParaTexto, type DadosCnpj } from './cnpjService';
import type { CompanyRow } from '../models/companyModel';
import {
  normalizar,
  tokens,
  tokensSignificativos,
  WORD_RE,
} from '../utils/textSearch';

export interface DocumentLocalMatch {
  document_id: string;
  filename: string;
  snippet: string;
  score: number;
}

export interface CompanyLocalMatch {
  cnpj: string;
  company: CompanyRow;
  dados: DadosCnpj | null;
  score: number;
}

export interface LocalSearchResult {
  docs: DocumentLocalMatch[];
  companies: CompanyLocalMatch[];
}

const SNIPPET_BEFORE = 200;
const SNIPPET_AFTER = 300;
const MAX_SNIPPET = 600;
const MIN_COVERAGE = 0.5;

const ACCENT_VARIANTS: Record<string, string> = {
  a: 'aáàâãAÁÀÂÃ',
  e: 'eéêèEÉÊÈ',
  i: 'iíîIÍÎ',
  o: 'oóôõòOÓÔÕÒ',
  u: 'uúûüUÚÛÜ',
  c: 'cçCÇ',
  n: 'nñNÑ',
};

function accentPattern(word: string): string {
  return [...word]
    .map((ch) => {
      const cls = ACCENT_VARIANTS[ch];
      if (cls) return `[${cls}]`;
      return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
}

function contarTermosNoTexto(terms: string[], text: string): number {
  let hits = 0;
  for (const term of terms) {
    const re = new RegExp(`\\b${accentPattern(term)}\\b`, 'i');
    if (re.test(text)) hits++;
  }
  return hits;
}

function focusTerms(consulta: string): string[] {
  const significativos = tokensSignificativos(consulta);
  return significativos.length > 0 ? significativos : tokens(consulta);
}

function coverage(terms: string[], text: string): number {
  if (terms.length === 0) return 0;
  const set = new Set(tokens(text));
  let hits = 0;
  for (const t of terms) if (set.has(t)) hits++;
  return hits / terms.length;
}

function makeSnippet(fullText: string, terms: string[]): string {
  const clean = fullText.replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  let best = { score: -1, start: 0, end: 0 };
  for (const term of terms) {
    const re = new RegExp(accentPattern(term), 'ig');
    let m: RegExpExecArray | null;
    while ((m = re.exec(clean)) !== null) {
      const anchor = m.index;
      const start = Math.max(0, anchor - SNIPPET_BEFORE);
      const end = Math.min(clean.length, anchor + m[0].length + SNIPPET_AFTER);
      const window = clean.slice(start, end);
      const score = contarTermosNoTexto(terms, window);
      if (score > best.score) {
        best = { score, start, end };
      }
      if (re.lastIndex === anchor) re.lastIndex++;
    }
  }

  if (best.score === -1) return clean.slice(0, MAX_SNIPPET);

  let snippet = clean.slice(best.start, best.end).trim();
  if (snippet.length > MAX_SNIPPET) {
    snippet = snippet.slice(0, MAX_SNIPPET).trim();
  }
  if (best.start > 0) snippet = `... ${snippet}`;
  if (best.end < clean.length) snippet = `${snippet} ...`;

  return snippet;
}

function coverScore(terms: string[], docText: string, filename: string): number {
  const docCov = coverage(terms, docText);
  const fileCov = coverage(terms, filename);
  return Math.max(docCov, fileCov);
}

export function buscarDocumentos(
  consulta: string,
  limit = 5,
): DocumentLocalMatch[] {
  const terms = focusTerms(consulta);
  if (terms.length === 0) return [];

  const rows = getDb()
    .prepare('SELECT id, filename, full_text FROM documents')
    .all() as unknown as { id: string; filename: string; full_text: string }[];

  const scored: DocumentLocalMatch[] = [];
  for (const row of rows) {
    const score = coverScore(terms, row.full_text, row.filename);
    if (score < MIN_COVERAGE) continue;
    scored.push({
      document_id: row.id,
      filename: row.filename,
      snippet: makeSnippet(row.full_text, terms),
      score,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buscarEmpresas(
  consulta: string,
  limit = 5,
): CompanyLocalMatch[] {
  const terms = focusTerms(consulta);
  if (terms.length === 0) return [];

  const rows = getDb()
    .prepare('SELECT * FROM companies')
    .all() as unknown as CompanyRow[];

  const scored: CompanyLocalMatch[] = [];
  for (const row of rows) {
    const nameText = `${row.company_name ?? ''} ${row.trade_name ?? ''}`;
    const rawText = typeof row.raw_data === 'string' ? row.raw_data : JSON.stringify(row.raw_data ?? '');
    const nameCov = coverage(terms, nameText);
    const rawCov = coverage(terms, rawText);
    const score = Math.max(nameCov, rawCov);
    if (score <= 0) continue;

    let dados: DadosCnpj | null = null;
    if (row.raw_data) {
      try {
        dados =
          typeof row.raw_data === 'string'
            ? (JSON.parse(row.raw_data) as DadosCnpj)
            : (row.raw_data as DadosCnpj);
      } catch {
        dados = null;
      }
    }

    scored.push({
      cnpj: row.cnpj,
      company: row,
      dados,
      score,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buscarLocal(
  consulta: string,
  limitDocs = 5,
  limitCompanies = 5,
): LocalSearchResult {
  return {
    docs: buscarDocumentos(consulta, limitDocs),
    companies: buscarEmpresas(consulta, limitCompanies),
  };
}

export function buildLocalContext(r: LocalSearchResult): string {
  const blocos: string[] = [];

  if (r.docs.length > 0) {
    blocos.push(
      ...r.docs.map(
        (d, i) =>
          `[Documento ${i + 1} (${d.filename})] ${d.snippet}`,
      ),
    );
  }

  if (r.companies.length > 0) {
    const cadastros = r.companies
      .map((c) => {
        if (c.dados?.nome) return cnpjParaTexto(c.dados);
        return `CNPJ ${c.cnpj} - ${c.company.company_name ?? ''}`;
      })
      .join('\n\n');
    blocos.push(`--- Dados cadastrais de empresas encontradas ---\n${cadastros}`);
  }

  return blocos.join('\n\n');
}