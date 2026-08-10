import ollama from "ollama";
import { Store } from "./store.js";

export interface Mensagem {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(
  store: Store,
  modelo: string,
  system: string,
  pergunta: string,
  historico: Mensagem[]
): Promise<string> {
  const contexto = await store.buscar(pergunta);
  const contextoTexto = contexto.map((c) => c.texto).join("\n\n");
  const messages: Mensagem[] = [];
  if (system) messages.push({ role: "system", content: system });
  const limit = Math.max(0, 10 - (system ? 1 : 0) - historico.length);
  messages.push(...historico.slice(-limit));
  messages.push({
    role: "user",
    content: `Contexto:\n${contextoTexto}\n\nPergunta:\n${pergunta}`,
  });
  const res = await ollama.chat({ model: modelo, messages });
  return res.message.content;
}