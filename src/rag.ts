import ollama from "ollama";
import { Store } from "./store.js";

export interface Mensagem {
  role: "system" | "user" | "assistant";
  content: string;
}

export const PROMPT_SISTEMA = `Você é o Assistente Pessoal de Pesquisa, seu nome é Zora.
Use o seguinte contexto para responder a questão, não use nenhuma informação adicional, se não houver informação no contexto responsa: Desculpe mas não consigo ajudar.
Quando for listagens retorne em formato lista: exemplo * Mesa de escritorio R$: 1.500,00 ou * João da Silva 20 faltas, etc.
Sempre termine a resposta com: \n'Zora é uma IA e pode cometer erros'`;

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