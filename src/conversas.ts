import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export type RoleConversa = "user" | "agente" | "system";

export interface MensagemConversa {
  id: number;
  secsaoId: number;
  mensagem: string;
  role: RoleConversa;
}

const CRIAR_TABELAS = `
  CREATE TABLE IF NOT EXISTS seccoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS conversas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    secsao_id INTEGER NOT NULL,
    mensagem TEXT NOT NULL,
    role TEXT NOT NULL,
    FOREIGN KEY (secsao_id) REFERENCES seccoes(id)
  );
  CREATE INDEX IF NOT EXISTS idx_conversas_seccao ON conversas(secsao_id, id);
`;

export class Conversas {
  private db: DatabaseSync;

  constructor(caminho: string) {
    fs.mkdirSync(path.dirname(caminho), { recursive: true });
    this.db = new DatabaseSync(caminho);
    this.db.exec(CRIAR_TABELAS);
  }

  novaSessao(): { id: number; title: string } {
    const title = new Date().toLocaleString("pt-BR");
    const r = this.db.prepare("INSERT INTO seccoes (title) VALUES (?)").run(title);
    return { id: Number(r.lastInsertRowid), title };
  }

  adicionar(secsaoId: number, mensagem: string, role: RoleConversa): void {
    this.db
      .prepare("INSERT INTO conversas (secsao_id, mensagem, role) VALUES (?, ?, ?)")
      .run(secsaoId, mensagem, role);
  }

  ultimas(secsaoId: number, limite = 5): MensagemConversa[] {
    const linhas = this.db
      .prepare(
        "SELECT id, secsao_id, mensagem, role FROM conversas WHERE secsao_id = ? ORDER BY id DESC LIMIT ?"
      )
      .all(secsaoId, limite) as {
      id: number;
      secsao_id: number;
      mensagem: string;
      role: RoleConversa;
    }[];
    return linhas
      .reverse()
      .map((l) => ({ id: l.id, secsaoId: l.secsao_id, mensagem: l.mensagem, role: l.role }));
  }

  contagem(): number {
    const r = this.db.prepare("SELECT COUNT(*) AS n FROM conversas").get() as { n: number };
    return r.n;
  }

  fechar(): void {
    this.db.close();
  }
}