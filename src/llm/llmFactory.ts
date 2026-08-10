import type { ProviderName } from '../setup/configStore';
import type { LLMProvider } from './types';
import { OllamaProvider } from './providers/ollamaProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { ClaudeProvider } from './providers/claudeProvider';
import { OpenAiProvider } from './providers/openaiProvider';
import { ZoraError } from '../errors/zoraErrors';

export interface ProviderOptions {
  provider: ProviderName;
  apiKey?: string;
  model?: string;
  ollamaHost?: string;
}

export function createLLM(options: ProviderOptions): LLMProvider {
  const model = options.model ?? defaultModel(options.provider);
  switch (options.provider) {
    case 'ollama':
      return new OllamaProvider(model, options.ollamaHost);
    case 'gemini':
      if (!options.apiKey) throw new ZoraError('missing_api_key', 'Chave de API do Gemini não configurada.', true);
      return new GeminiProvider(model, options.apiKey);
    case 'claude':
      if (!options.apiKey) throw new ZoraError('missing_api_key', 'Chave de API do Claude não configurada.', true);
      return new ClaudeProvider(model, options.apiKey);
    case 'openai':
      if (!options.apiKey) throw new ZoraError('missing_api_key', 'Chave de API do OpenAI não configurada.', true);
      return new OpenAiProvider(model, options.apiKey);
    default:
      throw new ZoraError('unsupported_provider', `Provedor não suportado: ${options.provider}`, true);
  }
}

export function defaultModel(provider: ProviderName): string {
  switch (provider) {
    case 'ollama':
      return 'gemma';
    case 'gemini':
      return 'gemini-2.0-flash';
    case 'claude':
      return 'claude-3-5-sonnet-latest';
    case 'openai':
      return 'gpt-4o-mini';
  }
}