import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";

function pastaInicial(): string {
  const docs = path.join(os.homedir(), "Documents");
  if (fs.existsSync(docs)) return docs;
  return os.homedir();
}

export async function escolherArquivo(): Promise<string | null> {
  const inicio = pastaInicial();
  try {
    const popup = spawnSync(
      "zenity",
      [
        "--file-selection",
        "--title=Selecione o documento (.txt ou .pdf)",
        "--file-filter=Documentos | *.txt *.pdf",
        `--filename=${inicio}/`,
      ],
      { encoding: "utf-8", timeout: 120000 }
    );
    if (popup.status === 0 && popup.stdout.trim()) {
      return popup.stdout.trim();
    }
  } catch {
    /* caminho alternativo abaixo */
  }
  return navegar(inicio);
}

async function navegar(pastaAtual: string): Promise<string | null> {
  let pasta = path.resolve(pastaAtual);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      console.clear();
      console.log(`Selecione o documento (.txt ou .pdf)\nLocal: ${pasta}\n`);
      const itens = fs
        .readdirSync(pasta, { withFileTypes: true })
        .sort((a, b) => {
          const aDir = a.isDirectory() ? 0 : 1;
          const bDir = b.isDirectory() ? 0 : 1;
          return aDir - bDir || a.name.localeCompare(b.name);
        });
      console.log("0) [subir uma pasta]");
      itens.forEach((it, i) => {
        if (it.isDirectory()) console.log(`${i + 1}) [pasta] ${it.name}/`);
        else console.log(`${i + 1}) ${it.name}`);
      });
      const resposta = await rl.question("\nDigite o número (ou 'sair'): ");
      const opcao = resposta.trim().toLowerCase();
      if (opcao === "sair") return null;
      if (!/^\d+$/.test(opcao)) continue;
      const idx = parseInt(opcao, 10);
      if (idx === 0) {
        const pai = path.dirname(pasta);
        if (pai !== pasta) pasta = pai;
        continue;
      }
      if (idx >= 1 && idx <= itens.length) {
        const caminho = path.join(pasta, itens[idx - 1].name);
        if (fs.statSync(caminho).isDirectory()) {
          pasta = caminho;
        } else if (caminho.toLowerCase().endsWith(".txt") || caminho.toLowerCase().endsWith(".pdf")) {
          return caminho;
        } else {
          await rl.question("Formato não suportado. Use .txt ou .pdf. Enter para continuar...");
        }
      }
    }
  } finally {
    rl.close();
  }
}

export function limparTerminal(): void {
  if (process.platform === "win32") execSync("cls", { stdio: "ignore" });
  else console.clear();
}