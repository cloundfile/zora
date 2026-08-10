import readline from "node:readline/promises";
import { Store } from "./store.js";
import { limparTerminal } from "./seletor.js";
import { chat } from "./rag.js";

const PROMPT = `Você é o Assistente Pessoal de Pesquisa, seu nome é Zora.
Use o seguinte contexto para responder a questão, não use nenhuma informação adicional, se não houver informação no contexto responsa: Desculpe mas não consigo ajudar.
Quando for listagens retorne em formato lista: exemplo * Mesa de escritorio R$: 1.500,00 ou * João da Silva 20 faltas, etc.
Sempre termine a resposta com: Mais alguma duvida?
e finalize com: "Zora é uma IA e pode cometer erros"`;

export async function iniciarRepl(store: Store, modelo: string, historico: unknown[]): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const pergunta = await rl.question("\nQual sua duvida hoje? (ou 'sair' para encerrar): ");
      if (pergunta.trim().toLowerCase() === "sair") {
        console.log("Saindo...");
        break;
      }
      if (!pergunta.trim()) continue;
      limparTerminal();
      console.log(`Pergunta: ${pergunta}\n`);
      const resposta = await chat(store, modelo, PROMPT, pergunta, historico);
      console.log(`Zora: ${resposta}\n`);
    }
  } finally {
    rl.close();
  }
}