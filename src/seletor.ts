import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { percorrerArquivos } from "./treinador.js";

function pastaInicial(): string {
  const docs = path.join(os.homedir(), "Documents");
  if (fs.existsSync(docs)) return docs;
  return os.homedir();
}

export async function escolherArquivos(): Promise<string[]> {
  const inicio = pastaInicial();
  try {
    const popup = spawnSync(
      "zenity",
      [
        "--file-selection",
        "--multiple",
        "--title=Selecione os documentos (.txt ou .pdf)",
        "--file-filter=Documentos | *.txt *.pdf",
        `--filename=${inicio}/`,
      ],
      { encoding: "utf-8", timeout: 120000 }
    );
    if (popup.status === 0 && popup.stdout.trim()) {
      return popup.stdout
        .trim()
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);
    }
  } catch {
    /* caminho alternativo abaixo */
  }
  return navegar(inicio);
}

async function navegar(pastaAtual: string): Promise<string[]> {
  let pasta = path.resolve(pastaAtual);
  const selecionados: string[] = [];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      console.clear();
      console.log(`Selecione os documentos (.txt ou .pdf)\nLocal: ${pasta}\n`);
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
        else {
          const marcado = selecionados.includes(path.join(pasta, it.name)) ? " [x]" : "";
          console.log(`${i + 1}) ${it.name}${marcado}`);
        }
      });
      if (selecionados.length > 0) {
        console.log(`\nSelecionados (${selecionados.length}):`);
        selecionados.slice(0, 15).forEach((s) => console.log(`  - ${path.basename(s)}`));
        if (selecionados.length > 15) console.log(`  ... e mais ${selecionados.length - 15}`);
      }
      console.log("\n'fim' para treinar | 'sair' para cancelar");
      const resposta = await rl.question("Digite o número (marca/desmarca) ou comando: ");
      const opcao = resposta.trim().toLowerCase();
      if (opcao === "sair") return [];
      if (opcao === "fim") return [...new Set(selecionados)];
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
          const r = await rl.question(
            `Pasta ${itens[idx - 1].name}/ selecionada. Deseja iniciar o treinamento de todos os arquivos dentro? (s/N): `
          );
          if (r.trim().toLowerCase() === "s") {
            const encontrados = percorrerArquivos(caminho);
            selecionados.push(...encontrados);
            console.log(`   ${encontrados.length} arquivo(s) adicionado(s).`);
          } else {
            pasta = caminho;
          }
        } else if (caminho.toLowerCase().endsWith(".txt") || caminho.toLowerCase().endsWith(".pdf")) {
          const pos = selecionados.indexOf(caminho);
          if (pos === -1) selecionados.push(caminho);
          else selecionados.splice(pos, 1);
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