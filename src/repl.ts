import readline from "node:readline/promises";
import { Store } from "./store.js";
import { limparTerminal } from "./seletor.js";
import { arquivoBanco } from "./backup.js";
import { Conversas, type MensagemConversa } from "./conversas.js";
import { chat, PROMPT_SISTEMA, type Mensagem } from "./rag.js";

function paraHistorico(mensagens: MensagemConversa[]): Mensagem[] {
  return mensagens.map((m) => ({
    role: m.role === "agente" ? "assistant" : (m.role === "user" ? "user" : "system"),
    content: m.mensagem,
  }));
}

export async function iniciarRepl(store: Store, modelo: string): Promise<void> {
  const conversas = new Conversas(arquivoBanco());
  const secao = conversas.novaSessao();
  console.log(`Nova seção iniciada: ${secao.title}`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const pergunta = await rl.question("\nQual sua duvida hoje? ");
      if (pergunta.trim().toLowerCase() === "sair") {
        console.log("Saindo...");
        break;
      }
      if (!pergunta.trim()) continue;
      const historico = paraHistorico(conversas.ultimas(secao.id, 10));
      conversas.adicionar(secao.id, pergunta, "user");
      limparTerminal();
      console.log(`Pergunta: ${pergunta}\n`);
      const resposta = await chat(store, modelo, PROMPT_SISTEMA, pergunta, historico);
      conversas.adicionar(secao.id, resposta, "agente");
      console.log(`Zora: ${resposta}\n`);
    }
  } finally {
    rl.close();
    conversas.fechar();
  }
}