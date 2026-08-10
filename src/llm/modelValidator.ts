import { execSync } from 'child_process';
import chalk from 'chalk';
import type { LLMProvider } from './types';
import { OllamaProvider } from './providers/ollamaProvider';
import { ZoraError } from '../errors/zoraErrors';

export function validateModels(llm: LLMProvider): Promise<void> {
  if (llm instanceof OllamaProvider) {
    return validateOllamaModels(llm);
  }
  return llm.testConnection().then(() => undefined);
}

async function validateOllamaModels(llm: OllamaProvider): Promise<void> {
  await llm.testConnection().catch((error) => {
    throw new ZoraError(
      'ollama_unreachable',
      'Não foi possível conectar ao servidor Ollama em localhost:11434: ' + (error as Error).message,
      true,
    );
  });

  let available: string[] = [];
  try {
    available = (await llm.listModels()).map(normalizeModelName);
  } catch {
    available = [];
  }

  await ensureModel(llm.model, available);
  await ensureModel(llm.embedModel, available);

  try {
    await llm.embed('integridade');
  } catch (error) {
    const zora = error as ZoraError;
    if (zora.code === 'ollama_embeddings_off') {
      throw zora;
    }
    throw new ZoraError(
      'embed_model_invalid',
      `O modelo de embeddings "${llm.embedModel}" não está gerando vetores: ${(error as Error).message}. ` +
        'Configure um modelo de embedding válido (ex.: nomic-embed-text) com `zora config`.',
      true,
    );
  }

  }

function normalizeModelName(name: string): string {
  return name.replace(/:.*$/, '').trim().toLowerCase();
}

async function ensureModel(model: string, available: string[]): Promise<void> {
  const key = normalizeModelName(model);
  if (available.includes(key)) return;

  console.log(chalk.cyan(`Baixando modelo "${model}"...`));
  try {
    execSync(`ollama pull ${model}`, { stdio: 'inherit', timeout: 600000 });
  } catch {
    throw new ZoraError(
      'model_not_found',
      `Modelo "${model}" não está disponível. Execute manualmente: ollama pull ${model}`,
      true,
    );
  }
}