import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import ollama from "ollama";
import { version } from "../package.json";

export const MODELO_PADRAO = "gemma2";
export const MODELO_EMBEDDING = "nomic-embed-text";

export function ollamaInstalado(): boolean {
  return encontrarComando("ollama");
}

function encontrarComando(cmd: string): boolean {
  const dirs = process.env.PATH?.split(path.delimiter) ?? [];
  return dirs.some((dir) => {
    if (fs.existsSync(path.join(dir, cmd))) return true;
    return fs.existsSync(path.join(dir, cmd + ".exe"));
  });
}

export function instalarOllama(): void {
  console.log("Ollama não encontrado na máquina. Instalando...");
  if (process.platform === "win32") {
    const pasta = path.join(os.homedir(), "ollama");
    fs.mkdirSync(pasta, { recursive: true });
    const instalador = path.join(pasta, "OllamaSetup.exe");
    spawnSync(
      "curl.exe",
      ["-L", "https://ollama.com/download/OllamaSetup.exe", "-o", instalador],
      { stdio: "inherit" }
    );
    spawnSync(instalador, ["/S"], { stdio: "inherit" });
  } else {
    spawnSync("bash", ["-lc", "curl -fsSL https://ollama.com/install.sh | sh"], {
      stdio: "inherit",
    });
  }
}

export function ollamaRodando(): boolean {
  try {
    const r = spawnSync("ollama", ["list"], { timeout: 5000 });
    return r.status === 0;
  } catch {
    return false;
  }
}

export function iniciarOllama(): void {
  if (ollamaRodando()) return;
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "ollama", "app"], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      spawn("ollama", ["serve"], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {
    /* ignorar */
  }
  for (let i = 0; i < 30; i++) {
    if (ollamaRodando()) return;
    sleepSync(1000);
  }
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function listarModelos(): string[] {
  try {
    const out = spawnSync("ollama", ["list"], { timeout: 10000, encoding: "utf-8" });
    if (out.status !== 0) return [];
    return out.stdout
      .split("\n")
      .slice(1)
      .map((l) => l.trim().split(/\s+/)[0])
      .filter(Boolean);
  } catch {
    return [];
  }
}

function baixarModelo(nome: string): void {
  console.log(`Baixando o LLM ${nome}... (pode demorar)`);
  spawnSync("ollama", ["pull", nome], { stdio: "inherit" });
}

export async function modeloFunciona(nome: string): Promise<boolean> {
  try {
    await ollama.chat({
      model: nome,
      messages: [{ role: "user", content: "oi" }],
      stream: false,
    });
    return true;
  } catch {
    return false;
  }
}

const CANDIDATOS: Record<string, string> = {
  gemma: "gemma2",
  qwen: "qwen2.5",
  llama: "llama3.2",
};

export async function garantirOllama(): Promise<string> {
  if (!ollamaInstalado()) {
    instalarOllama();
    iniciarOllama();
    baixarModelo(MODELO_PADRAO);
    await baixarEmbedding();
    console.log(`Zora: ${MODELO_PADRAO} Version: ${version}`);
    return MODELO_PADRAO;
  }

  iniciarOllama();
  const modelos = (await listarModelos()).filter(
    (m) => m !== MODELO_EMBEDDING && m !== `${MODELO_EMBEDDING}:latest`
  );

  const modeloDefault = modelos[0];
  if (modeloDefault && (await modeloFunciona(modeloDefault))) {
    console.log(`Zora: ${modeloDefault} Version: ${version}`);
    await baixarEmbedding();
    return modeloDefault;
  }

  return solicitarModeloAlternativo(modeloDefault);
}

export async function solicitarModeloAlternativo(
  invalido?: string
): Promise<string> {
  if (invalido) {
    console.log(`O modelo ${invalido} não está funcionando corretamente.`);
  }
  console.log("Escolha um dos modelos recomendados:");
  Object.entries(CANDIDATOS).forEach(([nome, modelo], i) => {
    console.log(`${i + 1}) ${modelo} (${nome})`);
  });
  console.log("0) Tenho outro modelo instalado");

  const escolha = await perguntar("\nDigite o número: ");
  const idx = parseInt(escolha.trim(), 10) - 1;
  const modelo = Object.values(CANDIDATOS)[idx];

  if (escolha.trim() === "0") {
    return aguardarModeloManual();
  }

  if (!modelo) {
    throw new Error("Opção inválida. Encerrando.");
  }

  if (await confirmarDownload(modelo)) {
    baixarModelo(modelo);
    await baixarEmbedding();
    console.log(`Modelo definido: ${modelo}`);
    return modelo;
  }

  console.log(
    "Download recusado. Instale manualmente um modelo compatível com chat e tente novamente."
  );
  console.log("Exemplos: ollama pull gemma2 | ollama pull qwen2.5 | ollama pull llama3.2");
  await aguardarEnter();

  const comChat = await primeiroModeloFuncional();
  if (comChat) {
    await baixarEmbedding();
    console.log(`Modelo verificado e em uso: ${comChat}`);
    return comChat;
  }
  return solicitarModeloAlternativo();
}

async function aguardarModeloManual(): Promise<string> {
  console.log(
    "Instale manualmente um modelo compatível com chat, por exemplo:\n" +
      "  ollama pull gemma2\n" +
      "  ollama pull qwen2.5\n" +
      "  ollama pull llama3.2"
  );
  await aguardarEnter();
  const comChat = await primeiroModeloFuncional();
  if (comChat) {
    await baixarEmbedding();
    console.log(`Modelo verificado e em uso: ${comChat}`);
    return comChat;
  }
  console.log("Nenhum modelo compatível com chat foi encontrado.");
  return solicitarModeloAlternativo();
}

async function primeiroModeloFuncional(): Promise<string | undefined> {
  const modelos = await listarModelos();
  for (const m of modelos) {
    if (m === MODELO_EMBEDDING || m === `${MODELO_EMBEDDING}:latest`) continue;
    if (await modeloFunciona(m)) return m;
  }
  return undefined;
}

function perguntar(pergunta: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return rl.question(pergunta).finally(() => rl.close());
}

function aguardarEnter(): Promise<void> {
  return perguntar("Pressione Enter para continuar...").then(() => undefined);
}

async function confirmarDownload(modelo: string): Promise<boolean> {
  const resposta = await perguntar(
    `O modelo ${modelo} não está instalado. Deseja baixá-lo? (s/N): `
  );
  return resposta.trim().toLowerCase() === "s";
}

export async function baixarEmbedding(): Promise<void> {
  const modelos = listarModelos();
  if (
    modelos.some(
      (m) => m === MODELO_EMBEDDING || m === `${MODELO_EMBEDDING}:latest`
    )
  ) {
    return;
  }
  console.log(`Baixando modelo de embeddings ${MODELO_EMBEDDING}...`);
  await ollama.pull({ model: MODELO_EMBEDDING });
}

export async function embedTexto(texto: string): Promise<number[]> {
  const res = await ollama.embed({ model: MODELO_EMBEDDING, input: texto });
  return res.embeddings[0];
}