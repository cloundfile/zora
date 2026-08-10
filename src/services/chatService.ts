import type { LLMProvider } from '../llm/types';
import { buildSystemPrompt, GUARDRAIL_RESPONSE } from '../llm/systemPrompt';
import { addMessage, getRecentMessages } from '../models/messageModel';
import { createSession, getSessionById, getLastSession } from '../models/sessionModel';
import { searchChunks, buildContext } from './vectorStore';
import { normalizeCnpj, lookupCnpj } from './cnpjService';

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

  const cnpjMatch = normalizeCnpj(input).match(/^[A-Z0-9]{14}$/i);
  if (cnpjMatch) {
    const data = await lookupCnpj(cnpjMatch[0]);
    if (data) {
      const output = formatCnpjAnswer(data);
      addMessage(sessionId, 'output', output);
      return output;
    }
  }

  const matches = await searchChunks(llm, input);
  const context = buildContext(matches);

  if (!context.trim()) {
    addMessage(sessionId, 'output', GUARDRAIL_RESPONSE);
    return GUARDRAIL_RESPONSE;
  }

  const history = getRecentMessages(sessionId, 10)
    .map((m) => ({
      role: m.role === 'input' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))
    .slice(-6);

  const contextMessage = {
    role: 'user' as const,
    content: `Contexto dos documentos:\n\n${context}\n\nPergunta: ${input}`,
  };

  const answer = await llm.complete([
    { role: 'system' as const, content: buildSystemPrompt() },
    ...history.filter((m) => m.content !== input),
    contextMessage,
  ]);
  addMessage(sessionId, 'output', answer);
  return answer;
}

function formatCnpjAnswer(data: unknown): string {
  const rec = (data ?? {}) as Record<string, unknown>;
  const razao = rec.razao_social ?? rec.company_name ?? 'desconhecida';
  const fantasia = rec.nome_fantasia ?? rec.trade_name;
  const cnpj = rec.cnpj ?? '';
  const situacao = rec.situacao ?? '';
  let out = `Dados do CNPJ ${cnpj}:\n- Razão Social: ${razao}`;
  if (fantasia) out += `\n- Nome Fantasia: ${fantasia}`;
  if (situacao) out += `\n- Situação: ${situacao}`;
  return out;
}