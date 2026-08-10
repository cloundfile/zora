# Zora

Assistente Pessoal de Pesquisa (versão TypeScript/Node.js).

CLI de RAG local: treine documentos (.txt/.pdf) e faça perguntas respondidas por um LLM via Ollama, com contexto recuperado por similaridade vetorial.

## Instalação

### A partir do código

Requer Node.js (>= 18) e Ollama instalado/rodando.

```bash
npm install
npm run build       # gera dist/zora.cjs
node dist/zora.cjs  # modo REPL
```

### Instaladores (.deb/.rpm)

As releases geram pacotes `.deb` e `.rpm` automaticamente (GitHub Actions). Eles exigem apenas `nodejs` e gerenciam o binário `/usr/bin/zora`.

```bash
# Debian/Ubuntu
sudo dpkg -i zora_*.deb

# Fedora/RHEL
sudo rpm -i zora-*.rpm
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

- Banco de dados: `~/zora/database/store.json` (chunks + embeddings via Ollama `nomic-embed-text`).
- Backups: `~/zora/backups/zora-backup-*.zip`.

## Desenvolvimento

- `npm run dev` — executa via tsx (sem build).
- `npm run build` — empacota tudo em um único arquivo `dist/zora.cjs` com esbuild.

## Licença

MIT