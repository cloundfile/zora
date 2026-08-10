# Zora

Assistente Pessoal de Pesquisa (versão TypeScript/Node.js).

CLI de RAG local: treine documentos (.txt/.pdf) e faça perguntas respondidas por um LLM via Ollama, com contexto recuperado por similaridade vetorial.

## Requisitos

- Node.js >= 22.13 (usa `node:sqlite`)
- Ollama instalado e rodando (o CLI tenta instalar/iniciar automaticamente se ausente)

## Instalação

```bash
npm install
npm run build       # gera dist/zora.cjs
node dist/zora.cjs  # modo REPL
```

## Uso

| Comando | Descrição |
| --- | --- |
| `zora` | Abre o REPL de perguntas |
| `zora treinar [-p caminho]` | Treina um documento (seletor gráfico/terminal ou `-p`) |
| `zora perguntar -p "pergunta"` | Faz uma pergunta em modo direto |
| `zora status` | Mostra chunks e documentos armazenados |
| `zora limpar` | Apaga o banco de dados |
| `zora backup` | Cria backup zipado em `~/zora/backups` |
| `zora restaurar [-p caminho.zip]` | Restaura backup |

## Dados

- Banco de dados: `~/zora/database/zora.db` (SQLite com chunks + embeddings via Ollama `nomic-embed-text`).
- Backups: `~/zora/backups/zora-backup-*.zip`.

## Desenvolvimento

- `npm run dev` — executa via tsx (sem build).
- `npm run typecheck` — checa os tipos com `tsc --noEmit`.
- `npm run build` — empacota tudo em um único arquivo `dist/zora.cjs` com esbuild.

## Licença

MIT
