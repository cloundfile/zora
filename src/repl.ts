import readline from "node:readline/promises";
import { Store } from "./store.js";
import { limparTerminal } from "./seletor.js";
import { chat, PROMPT_SISTEMA, type Mensagem } from "./rag.js";

export async function iniciarRepl(store: Store, modelo: string, historico: Mensagem[] = []): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const pergunta = await rl.question("\nQual sua duvida hoje? ");
      if (pergunta.trim().toLowerCase() === "sair") {
        console.log("Saindo...");
        break;
      }
      if (!pergunta.trim()) continue;
      limparTerminal();
      console.log(`Pergunta: ${pergunta}\n`);
      const resposta = await chat(store, modelo, PROMPT_SISTEMA, pergunta, historico);
      console.log(`Zora: ${resposta}\n`);
    }
  } finally {
    rl.close();
  }
}