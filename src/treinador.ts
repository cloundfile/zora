import { createHash } from "node:crypto";
import PdfParse from "pdf-parse";
import fs from "node:fs";

export function lerDocumento(arquivo: string): Promise<string> {
  if (arquivo.toLowerCase().endsWith(".pdf")) {
    return PdfParse(fs.readFileSync(arquivo)).then((data) => data.text);
  } else {
    return Promise.resolve(fs.readFileSync(arquivo, "utf-8"));
  }
}

export function hashDocumento(texto: string): string {
  return createHash("sha256").update(texto, "utf-8").digest("hex");
}

export function getChunks(text: string, size = 1000, overlap = 200): string[] {
  if (size <= overlap) throw new Error("Chunk menor que o overlap");
  const chunks: string[] = [];
  let inicio = 0;
  while (inicio < text.length) {
    const final = inicio + size;
    chunks.push(text.slice(inicio, final));
    inicio = final >= text.length ? text.length : inicio + size - overlap;
  }
  return chunks;
}