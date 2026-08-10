import { Ollama } from 'ollama';
import type { LLMProvider, ChatMessage } from '../types';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama' as const;
  private client: Ollama;

  constructor(
    public readonly model: string,
    private readonly host = 'http://localhost:11434',
  ) {
    this.client = new Ollama({ host });
  }

  static async isActive(host = 'http://localhost:11434'): Promise<boolean> {
    try {
      const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<void> {
    const ok = await OllamaProvider.isActive(this.host);
    if (!ok) throw new Error('Ollama não está ativo em ' + this.host);
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const res = await this.client.chat({
      model: this.model,
      messages,
    });
    return res.message.content;
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embed({ model: this.model, input: text });
    const embedding = res.embeddings?.[0];
    if (!embedding) throw new Error('Embedding vazio retornado pelo Ollama.');
    return embedding;
  }

  async listModels(): Promise<string[]> {
    const tags = await this.client.list();
    return tags.models.map((m) => m.name);
  }
}