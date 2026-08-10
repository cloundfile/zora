import type { LLMProvider, ChatMessage } from '../types';
import OpenAI from 'openai';

export class OpenAiProvider implements LLMProvider {
  readonly name = 'openai' as const;
  private client: OpenAI;

  constructor(public readonly model: string, apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async testConnection(): Promise<void> {
    await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: 'Responda apenas: ok' }],
      max_tokens: 10,
    });
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
    return res.choices[0]?.message?.content ?? '';
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return res.data[0]?.embedding ?? [];
  }
}