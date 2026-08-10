import type { ProviderName } from '../setup/configStore';

export type ChatMessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

export interface LLMProvider {
  readonly name: ProviderName;
  readonly model: string;
  complete(messages: ChatMessage[]): Promise<string>;
  embed(text: string): Promise<number[]>;
  testConnection(): Promise<void>;
}