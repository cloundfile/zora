import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { embedTexto } from "./ollama-setup.js";

export interface Chunk {
  id: string;
  texto: string;
  hash: string;
  arquivo: string;
  embedding: number[];
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function paraBuffer(vetor: number[]): Buffer {
  return Buffer.from(Float32Array.from(vetor).buffer);
}

function paraVetor(buf: Uint8Array): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

const CRIAR_TABELA = `
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    texto TEXT NOT NULL,
    hash TEXT NOT NULL,
    arquivo TEXT NOT NULL,
    embedding BLOB NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_chunks_hash ON chunks(hash);
`;

export class Store {
  private db: DatabaseSync;
  private insert!: ReturnType<DatabaseSync["prepare"]>;

  constructor(public caminho: string) {
    fs.mkdirSync(path.dirname(caminho), { recursive: true });
    this.db = new DatabaseSync(caminho);
    this.db.exec(CRIAR_TABELA);
    this.insert = this.db.prepare(
      "INSERT OR REPLACE INTO chunks (id, texto, hash, arquivo, embedding) VALUES (?, ?, ?, ?, ?)"
    );
    this.migrarLegado();
  }

  private migrarLegado(): void {
    const legado = path.join(path.dirname(this.caminho), "store.json");
    if (!fs.existsSync(legado)) return;
    if (this.contagem() > 0) return;
    let dados: Chunk[];
    try {
      dados = JSON.parse(fs.readFileSync(legado, "utf-8"));
    } catch {
      return;
    }
    if (!Array.isArray(dados) || dados.length === 0) return;
    for (const c of dados) {
      if (!c || !c.embedding || !Array.isArray(c.embedding)) continue;
      this.insert.run(c.id, c.texto, c.hash, c.arquivo, paraBuffer(c.embedding));
    }
    fs.renameSync(legado, `${legado}.migrado`);
    console.log(`Migrados ${dados.length} chunks de store.json para o banco SQLite.`);
  }

  async adicionar(texto: string, hash: string, arquivo: string): Promise<void> {
    const embedding = await embedTexto(texto);
    const idx = this.contagem();
    const chunk: Chunk = {
      id: `${hash}-${idx}`,
      texto,
      hash,
      arquivo,
      embedding,
    };
    this.insert.run(chunk.id, chunk.texto, chunk.hash, chunk.arquivo, paraBuffer(chunk.embedding));
  }

  async buscar(consulta: string, topK = 3): Promise<Chunk[]> {
    const q = Float32Array.from(await embedTexto(consulta));
    const linhas = this.db
      .prepare("SELECT id, texto, hash, arquivo, embedding FROM chunks")
      .all() as { id: string; texto: string; hash: string; arquivo: string; embedding: Uint8Array }[];
    const scored = linhas
      .map((l) => ({
        c: {
          id: l.id,
          texto: l.texto,
          hash: l.hash,
          arquivo: l.arquivo,
          embedding: Array.from(paraVetor(l.embedding)),
        } as Chunk,
        score: cosine(q, paraVetor(l.embedding)),
      }))
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.c);
  }

  get chunks(): Chunk[] {
    const linhas = this.db
      .prepare("SELECT id, texto, hash, arquivo, embedding FROM chunks")
      .all() as { id: string; texto: string; hash: string; arquivo: string; embedding: Uint8Array }[];
    return linhas.map((l) => ({
      id: l.id,
      texto: l.texto,
      hash: l.hash,
      arquivo: l.arquivo,
      embedding: Array.from(paraVetor(l.embedding)),
    }));
  }

  contagem(): number {
    const r = this.db.prepare("SELECT COUNT(*) AS n FROM chunks").get() as { n: number };
    return r.n;
  }

  limpar(): void {
    this.db.exec("DELETE FROM chunks");
  }

  jaExiste(hash: string): boolean {
    const r = this.db.prepare("SELECT 1 AS x FROM chunks WHERE hash = ? LIMIT 1").get(hash) as
      | { x: number }
      | undefined;
    return !!r;
  }

  fechar(): void {
    this.db.close();
  }
}