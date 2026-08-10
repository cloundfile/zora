#!/usr/bin/env node
import { garantirOllama } from "./ollama-setup.js";
import { Store } from "./store.js";
import { arquivoBanco, criarBackup, restaurarBackup, pastaDatabase } from "./backup.js";
import { escolherArquivo, limparTerminal } from "./seletor.js";
import { lerDocumento, hashDocumento, getChunks } from "./treinador.js";
import { iniciarRepl } from "./repl.js";
import { chat, PROMPT_SISTEMA } from "./rag.js";
import fs from "node:fs";
import readline from "node:readline/promises";

process.noDeprecation = true;

const warnOriginal = console.warn;
const logOriginal = console.log;
const filtrarTT = (...args: unknown[]) =>
  typeof args[0] === "string" && args[0].startsWith("Warning: TT: undefined function");
console.warn = (...args: unknown[]) => {
  if (filtrarTT(...args)) return;
  warnOriginal(...args);
};
console.log = (...args: unknown[]) => {
  if (filtrarTT(...args)) return;
  logOriginal(...args);
};

const args = process.argv.slice(2);
const comando = args[0]?.toLowerCase();
const manual =
  args.includes("-p") && args[args.indexOf("-p") + 1]
    ? args[args.indexOf("-p") + 1]
    : undefined;

async function treinar(): Promise<void> {
  fs.mkdirSync(pastaDatabase(), { recursive: true });
  const store = new Store(arquivoBanco());
  const arquivo = manual ?? (await escolherArquivo());
  if (!arquivo) {
    console.log("Nenhum documento selecionado.");
    return;
  }
  const texto = await lerDocumento(arquivo);
  const hash = hashDocumento(texto);
  if (store.jaExiste(hash)) {
    console.log("Documento já treinado. Nada a fazer.");
    return;
  }
  const chunks = getChunks(texto);
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`Treinando chunk ${i + 1}/${chunks.length} (${arquivo})\r`);
    await store.adicionar(chunks[i], hash, arquivo);
  }
  console.log(`\nTreinamento concluído: ${chunks.length} chunks adicionados.`);
}

async function perguntar(): Promise<void> {
  if (!manual) {
    console.log("Use: zora perguntar -p 'sua pergunta'");
    return;
  }
  const store = new Store(arquivoBanco());
  if (store.contagem() === 0) {
    console.log("Nenhum documento treinado ainda. Use 'zora treinar' primeiro.");
    return;
  }
  const modelo = await garantirOllama();
  const resposta = await chat(store, modelo, PROMPT_SISTEMA, manual, []);
  console.log(resposta);
}

async function status(): Promise<void> {
  const store = new Store(arquivoBanco());
  console.log(`Chunks armazenados: ${store.contagem()}`);
  const arquivos = new Set(store.chunks.map((c) => c.arquivo));
  console.log(`Documentos: ${arquivos.size}`);
  for (const a of arquivos) {
    console.log(`  - ${a}`);
  }
}

async function limpar(): Promise<void> {
  const store = new Store(arquivoBanco());
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`Serão removidos ${store.contagem()} chunks do banco de dados.`);
  const q = await rl.question("Tem certeza? (s/N): ");
  rl.close();
  if (q.trim().toLowerCase() == "s") {
    store.limpar();
    console.log("Banco de dados limpo.");
  }
}

async function main(): Promise<void> {
  limparTerminal();
  switch (comando) {
    case undefined:
    case "":
      const modelo = await garantirOllama();
      const store = new Store(arquivoBanco());
      await iniciarRepl(store, modelo, []);
      break;
    case "treinar":
      await treinar();
      break;
    case "perguntar":
      await perguntar();
      break;
    case "status":
      await status();
      break;
    case "limpar":
      await limpar();
      break;
    case "backup":
      try {
        const destino = criarBackup();
        console.log(`Backup criado em: ${destino}`);
      } catch (e) {
        console.log(e instanceof Error ? e.message : e);
      }
      break;
    case "restaurar":
      try {
        await restaurarBackup(manual);
      } catch (e) {
        console.log(e instanceof Error ? e.message : e);
      }
      break;
    default:
      console.log(
        `Comando desconhecido: ${comando}\nComandos: treinar, perguntar, status, limpar, backup, restaurar`
      );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});