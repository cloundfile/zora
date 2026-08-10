#!/usr/bin/env node
import { garantirOllama } from "./ollama-setup.js";
import { Store } from "./store.js";
import { arquivoBanco, criarBackup, restaurarBackup, pastaDatabase } from "./backup.js";
import { escolherArquivos, limparTerminal } from "./seletor.js";
import { lerDocumento, hashDocumento, getChunks, percorrerArquivos } from "./treinador.js";
import { buscarCnpj, cnpjParaTexto, formatarCnpj, limparCnpj, validarCnpj } from "./cnpj.js";
import { iniciarRepl } from "./repl.js";
import { chat, PROMPT_SISTEMA } from "./rag.js";
import fs from "node:fs";
import path from "node:path";
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
  let arquivos = manual ? [manual] : await escolherArquivos();
  if (arquivos.length === 0) {
    console.log("Nenhum documento selecionado.");
    return;
  }
  const pastas = arquivos.filter((a) => {
    try {
      return fs.statSync(a).isDirectory();
    } catch {
      return false;
    }
  });
  if (pastas.length > 0) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const nArq = pastas.reduce((acc, p) => acc + percorrerArquivos(p).length, 0);
    const q = await rl.question(
      `Pasta(s) selecionada(s). Deseja iniciar o treinamento dos ${nArq} arquivos encontrados? (s/N): `
    );
    rl.close();
    if (q.trim().toLowerCase() === "s") {
      const expandidos: string[] = [];
      for (const a of arquivos) {
        try {
          if (fs.statSync(a).isDirectory()) expandidos.push(...percorrerArquivos(a));
          else expandidos.push(a);
        } catch {
          /* arquivo inexistente */
        }
      }
      arquivos = [...new Set(expandidos)];
    } else {
      arquivos = arquivos.filter((a) => {
        try {
          return !fs.statSync(a).isDirectory();
        } catch {
          return false;
        }
      });
    }
  }
  if (arquivos.length === 0) {
    console.log("Nenhum documento para treinar.");
    return;
  }
  console.log(`${arquivos.length} documento(s) na fila.`);
  let treinados = 0;
  let pulados = 0;
  for (const arquivo of arquivos) {
    let texto: string;
    try {
      texto = await lerDocumento(arquivo);
    } catch (e) {
      console.error(`Falha ao ler ${arquivo}: ${e instanceof Error ? e.message : e}`);
      pulados++;
      continue;
    }
    const hash = hashDocumento(texto);
    if (store.jaExiste(hash)) {
      console.log(`Já treinado, pulando: ${path.basename(arquivo)}`);
      pulados++;
      continue;
    }
    const chunks = getChunks(texto);
    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`Treinando ${path.basename(arquivo)} - chunk ${i + 1}/${chunks.length}\r`);
      await store.adicionar(chunks[i], hash, arquivo);
    }
    process.stdout.write("\n");
    treinados++;
  }
  const texto = arquivos.length === 1 ? "documento" : "documentos";
  console.log(`\nTreinamento concluído: ${treinados} ${texto} adicionado(s), ${pulados} pulado(s).`);
}

async function treinarCnpj(): Promise<void> {
  const cnpj = manual ?? (await perguntaCnpj());
  if (!cnpj) {
    console.log("Nenhum CNPJ informado.");
    return;
  }
  const digitos = limparCnpj(cnpj);
  if (!validarCnpj(digitos)) {
    console.log(`CNPJ inválido: ${cnpj}`);
    return;
  }
  console.log(`Consultando CNPJ ${formatarCnpj(digitos)}...`);
  let dados;
  try {
    dados = await buscarCnpj(digitos);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return;
  }
  if (dados.status && dados.status !== "OK") {
    console.log(`Consulta retornou status: ${dados.status}`);
    return;
  }
  const texto = cnpjParaTexto(dados);
  fs.mkdirSync(pastaDatabase(), { recursive: true });
  const store = new Store(arquivoBanco());
  const hash = hashDocumento(texto);
  if (store.jaExiste(hash)) {
    console.log("CNPJ já treinado. Nada a fazer.");
    return;
  }
  const origem = `CNPJ ${formatarCnpj(digitos)}`;
  const chunks = getChunks(texto);
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`Vetorizando chunk ${i + 1}/${chunks.length} (${origem})\r`);
    await store.adicionar(chunks[i], hash, origem);
  }
  console.log(`\nCNPJ treinado: ${chunks.length} chunks adicionados.`);
}

async function perguntaCnpj(): Promise<string | null> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question("Digite o CNPJ: ")).trim() || null;
  } finally {
    rl.close();
  }
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
      await iniciarRepl(store, modelo);
      break;
    case "treinar":
      await treinar();
      break;
    case "cnpj":
      await treinarCnpj();
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
        `Comando desconhecido: ${comando}\nComandos: treinar, cnpj, perguntar, status, limpar, backup, restaurar`
      );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});