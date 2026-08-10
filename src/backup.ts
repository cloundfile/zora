import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";

export function pastaDados(): string {
  return path.join(os.homedir(), "zora");
}

export function pastaDatabase(): string {
  return path.join(pastaDados(), "database");
}

export function arquivoBanco(): string {
  return path.join(pastaDatabase(), "zora.db");
}

export function pastaBackup(): string {
  return path.join(pastaDados(), "backups");
}

export function criarBackup(): string {
  const db = pastaDatabase();
  if (!fs.existsSync(db)) {
    throw new Error("Nenhum banco de dados para fazer backup.");
  }
  const backups = pastaBackup();
  fs.mkdirSync(backups, { recursive: true });
  const data = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const destino = path.join(backups, `zora-backup-${data}.zip`);
  const zip = new AdmZip();
  zip.addLocalFolder(db);
  zip.writeZip(destino);
  return destino;
}

export async function restaurarBackup(manual?: string): Promise<void> {
  const bb = pastaBackup();
  let arquivo = manual;
  if (!arquivo) {
    if (!fs.existsSync(bb)) {
      throw new Error("Nenhum backup encontrado.");
    }
    const zips = fs
      .readdirSync(bb)
      .filter((f) => f.endsWith(".zip"))
      .sort()
      .reverse();
    if (zips.length === 0) {
      throw new Error("Nenhum backup encontrado.");
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("Backups disponíveis:");
    zips.forEach((z, i) => console.log(`${i + 1}) ${z}`));
    const escolha = await rl.question("\nEscolha o backup (número): ");
    rl.close();
    const idx = parseInt(escolha, 10) - 1;
    if (idx < 0 || idx >= zips.length) throw new Error("Opção inválida.");
    arquivo = path.join(bb, zips[idx]);
  }
  const zip = new AdmZip(arquivo);
  fs.mkdirSync(pastaDatabase(), { recursive: true });
  zip.extractAllTo(pastaDatabase(), true);
  console.log("Backup restaurado com sucesso.");
}