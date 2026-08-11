import { createSession, getSessionById, getLastSession } from '../models/sessionModel';
import { buildSystemPrompt, GUARDRAIL_RESPONSE } from '../llm/systemPrompt';
import { searchChunks, buildContext, type ChunkMatch } from './vectorStore';
import { buscarLocal, buildLocalContext } from './localSearchService';
import { addMessage, getRecentMessages } from '../models/messageModel';
import type { LLMProvider, ChatMessage } from '../llm/types';
import { getChunkCount } from '../models/documentModel';
import { buscarCnpj, cnpjParaTexto, extrairCnpjs, formatarCnpj, limparCnpj, validarCnpj, type DadosCnpj } from './cnpjService';
import { getCompany } from '../models/companyModel';
import chalk from 'chalk';

export interface ChatTurn {
  input: string;
  output: string;
}

export function resolveSession(sessionId?: string): string {
  if (sessionId && getSessionById(sessionId)) return sessionId;
  const last = getLastSession();
  if (last) return last.id;
  return createSession().id;
}

export async function answerQuestion(
  llm: LLMProvider,
  sessionId: string,
  input: string,
): Promise<string> {
  addMessage(sessionId, 'input', input);

  const cnpj = limparCnpj(input);
  if (validarCnpj(cnpj)) {
    try {
      const dados = await buscarCnpj(cnpj);
      const output = cnpjParaTexto(dados);
      addMessage(sessionId, 'output', output);
      return output;
    } catch (error) {
      const output =
        `Não encontrei os dados do CNPJ ${formatarCnpj(cnpj)} agora (${(error as Error).message}). ` +
        'Tente novamente mais tarde.';
      addMessage(sessionId, 'output', output);
      return output;
    }
  }

  const local = buscarLocal(input);

  let matches: ChunkMatch[] = [];
  if (getChunkCount() > 0) {
    try {
      matches = await searchChunks(llm, input, 5);
    } catch (error) {
      console.log(
        chalk.yellow(
          `⚠️ Não foi possível gerar embeddings: ${(error as Error).message} ` +
            'Garanta que o Ollama esteja com suporte a embeddings (`ollama serve --embeddings`).',
        ),
      );
    }
  }

  const contextoBase = [buildContext(matches), buildLocalContext(local)]
    .filter((c) => c.trim().length > 0)
    .join('\n\n');

  if (!contextoBase.trim()) {
    addMessage(sessionId, 'output', GUARDRAIL_RESPONSE);
    return GUARDRAIL_RESPONSE;
  }

  const context = await enriquecerContexto(contextoBase);

  const history = getRecentMessages(sessionId, 5)
    .map((m): ChatMessage => ({
      role: m.role === 'input' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))
    .filter((m) => m.content !== input);

  const answer = await llm.complete([
    { role: 'system' as const, content: buildSystemPrompt({ history, chunks: context }) },
    { role: 'user' as const, content: `Contexto:\n\n${context}\n\nPergunta: ${input}` },
  ]);
  addMessage(sessionId, 'output', answer);
  return answer;
}

async function enriquecerContexto(contexto: string): Promise<string> {
  const cnpjs = extrairCnpjs(contexto);
  if (cnpjs.length === 0) return contexto;

  const blocos: string[] = [];
  for (const cnpj of cnpjs) {
    const dados = await carregarDadosCnpj(cnpj);
    if (dados?.nome) blocos.push(cnpjParaTexto(dados));
  }
  if (blocos.length === 0) return contexto;

  return `${contexto}\n\n--- Dados cadastrais dos CNPJs citados nos documentos ---\n${blocos.join('\n\n')}`;
}

async function carregarDadosCnpj(cnpj: string): Promise<DadosCnpj | null> {
  const local = getCompany(cnpj);
  if (local?.raw_data) {
    try {
      return typeof local.raw_data === 'string' ? (JSON.parse(local.raw_data) as DadosCnpj) : (local.raw_data as DadosCnpj);
    } catch {
      return null;
    }
  }

  try {
    return await buscarCnpj(cnpj);
  } catch {
    return null;
  }
}
