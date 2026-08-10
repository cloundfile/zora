import { loadConfig } from '../setup/configStore';
import { createLLM } from '../llm/llmFactory';
import type { LLMProvider } from '../llm/types';

export function buildLlm(): LLMProvider {
  const config = loadConfig();
  return createLLM({
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
  });
}