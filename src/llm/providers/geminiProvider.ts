import { GoogleGenAI } from '@google/genai';
import type { LLMProvider, ChatMessage } from '../types';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const;
  private client: GoogleGenAI;

  constructor(public readonly model: string, apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async testConnection(): Promise<void> {
    const res = await this.client.models.generateContent({
      model: this.model,
      contents: 'Responda apenas: ok',
    });
    if (!res.text) throw new Error('Resposta vazia do Gemini.');
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));
    const res = await this.client.models.generateContent({
      model: this.model,
      contents,
    });
    return res.text ?? '';
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });
    return res.embeddings?.[0]?.values ?? [];
  }
}