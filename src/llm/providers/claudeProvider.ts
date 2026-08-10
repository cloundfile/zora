import type { LLMProvider, ChatMessage } from '../types';
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude' as const;
  private client: Anthropic;

  constructor(public readonly model: string, apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async testConnection(): Promise<void> {
    await this.client.messages.create({
      model: this.model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Responda apenas: ok' }],
    });
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const apiMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: system || undefined,
      messages: apiMessages,
    });
    return res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');
  }

  async embed(_text: string): Promise<number[]> {
    // Claude não expõe embeddings públicos; usa fallback determinístico.
    throw new Error('Embeddings não suportados pelo Claude.');
  }
}