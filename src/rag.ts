import ollama from "ollama";
import { Store } from "./store.js";
import { formatarCnpj, extrairCnpjs, obterDadosCnpj } from "./cnpj.js";

export interface Mensagem {
  role: "system" | "user" | "assistant";
  content: string;
}

export const PROMPT_SISTEMA = `Você é o Assistente Pessoal de Pesquisa, seu nome é Zora.
Português do Brasil, resposta direta, sem olá.
As mensagens anteriores que você recebeu nesta mesma conversa fazem parte do contexto desta seção; use-as para manter coerência e retomar o que já foi perguntado.
Quando a pergunta menciona um CNPJ e as informações dessa empresa não estiverem no contexto, consulte os dados do CNPJ automaticamente e treine-os antes de responder.
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
  const infosCnpj: string[] = [];
  for (const cnpj of extrairCnpjs(pergunta)) {
    const info = await obterDadosCnpj(store, cnpj);
    if (info) {
      infosCnpj.push(info);
      console.log(`\nCNPJ ${formatarCnpj(cnpj)} consultado (já existia ou treinado automaticamente).`);
    }
  }
  const contexto = await store.buscar(pergunta);
  const contextoTexto = [
    ...infosCnpj,
    ...contexto.map((c) => c.texto),
  ].join("\n\n");
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