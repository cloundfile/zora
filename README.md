<div align="center">

# ⭐ Zora

**Seu assistente pessoal, 100% no seu computador.**

RAG local + consulta de CNPJ (Receita Federal) + Ollama e LLMs cloud (Gemini, Claude, ChatGPT), tudo em uma CLI baseada em SQLite vetorizado.

[![npm version](https://img.shields.io/npm/v/@inneobr/zora.svg?color=magenta)](https://www.npmjs.com/package/@inneobr/zora)
[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)
[![Node.js v20+](https://img.shields.io/badge/node-%E2%89%A520-339933)](https://nodejs.org)

`Zora, seu assistente pessoal.`

---

### 🚀 Instalação

```bash
npm install -g @inneobr/zora
```

> Requisitos: Node.js **v20+**. O **[Ollama](https://ollama.com)** é recomendado como LLM local (Gemma, Llama3, Mistral); sem Ollama, use Gemini, Claude ou ChatGPT com sua chave de API.

</div>

---

## ✨ O que o Zora faz por você

| Recurso | Descrição |
| :--- | :--- |
| 🧠 **Chat RAG** | Treine `.pdf`, `.txt` e `.json` e converse com seus documentos. O Zora responde **somente** com base no que foi treinado — nunca inventa. |
| 🏢 **Consulta de CNPJ** | Busque empresas diretamente no chat. Consulta local primeiro, com fallback para a API da Receita Federal e fila de reprocessamento offline. |
| 🔀 **Multi-LLM** | Use **Ollama** local (recomendado) ou **Gemini**, **Claude** e **ChatGPT** via API — troque a qualquer momento com `zora config`. |
| 🗄️ **SQLite vetorizado** | Chunks de 500 caracteres, embeddings e busca por similaridade de cosseno em banco local. |
| 💬 **Sessões** | Histórico organizado em seções: retome qualquer conversa quando quiser. |
| 🛡️ **Guardrail rígido** | Sem contexto nos documentos, a resposta é exatamente: `Não posso ajudar com essa questão.` |
| 🧼 **Integridade** | Deduplicação de documentos via **SHA-256** e de CNPJs via chave composta — nada de retrabalho inútil. |
| 💾 **Backup automático** | Backups diários e mensais do seu banco em `~/.zora/backups/`. |

---

## ⚡ Começo rápido

```bash
# 1. Instale globalmente
npm install -g @inneobr/zora

# 2. Treine seus documentos (abre o seletor de arquivos do SO)
zora treinamentos

# 3. Converse
zora
```

No chat, o Zora o cumprimenta com **"Em que posso ajudar?"** e fica aguardando suas mensagens:

```text
┌──────────────────────────────┐
│  Zora — seu assistente pessoal │
└──────────────────────────────┘

Seção: [título]
Você: Qual o prazo de pagamento no meu contrato?
Zora: Conforme o contrato (documento original.pdf): 30 dias a partir da emissão da nota fiscal.
```

Digite `sair`, `exit` ou `quit` para encerrar o chat.

---

## 🧭 Comandos

| Comando | Descrição |
| :--- | :--- |
| `zora` | Inicia ou retoma a sessão ativa e abre o chat interativo |
| `zora treinamentos` | Seletor nativo de arquivos (`.pdf`/`.txt`/`.json`) → chunking + embeddings |
| `zora sections` | Lista e retoma uma seção existente |
| `zora config` | Alterna provedor/LLM, API key e modelo |
| `zora reset` | Limpa o histórico de conversas (mantém documentos treinados) |
| `zora delete <id>` | Exclui uma seção permanentemente |
| `zora exportar` | Exporta o banco SQLite (`.db`) com "Salvar Como" |
| `zora restore` | Restaura um backup `.db` |
| `zora kill` | Purga **todos** os dados e backups (exige `CONFIRMAR`) |
| `zora version` / `-v` | Versão, autor, licença e dados do SO/Node.js |
| `zora help` | Menu de ajuda completo |

---

## 🗺️ Como funciona

```text
Você ──► CLI Zora ──► SQLite (vetores) ◄── treinamentos (.pdf/.txt/.json)
              │
              ├── Ollama (local)  ►  embeddings + resposta
              └── Gemini / Claude / OpenAI (cloud, com API key)
              │
              └── CNPJ ─► consulta local ► ReceitaWS ► fila offline
```

- **RAG:** o documento é dividido em chunks de **500 caracteres**, cada um vira embedding; sua pergunta é convertida em embedding e comparada por **cosseno** para recuperar os trechos mais relevantes.
- **Guardrail:** sem contexto recuperado, o Zora responde `Não posso ajudar com essa questão.` e **nada mais**.
- **CNPJ:** query direta no chat (`47.160.123/0001-45`). Dados em cache local primeiro; se ausentes, busca na Receita e agenda reprocessamento na fila offline.
- **Ilha de confiança:** a primeira execução configura sua LLM (Ollama recomendado) e salva tudo em `~/.zorarc`.

---

## 🖥️ LLMs suportadas

| Provedor | Tipo | Modelos sugeridos |
| :--- | :--- | :--- |
| **Ollama** | Local (recomendado) | `gemma`, `mistral`, `llama3` |
| **Gemini** (Google) | Cloud | `gemini-2.0-flash`, `text-embedding-004` |
| **Claude** (Anthropic) | Cloud | `claude-3-5-sonnet-latest` |
| **ChatGPT** (OpenAI) | Cloud | `gpt-4o-mini`, `text-embedding-3-small` |

---

## 🧪 Desenvolvimento

```bash
npm install
npm run build     # compila para dist/
npm test          # suíte Vitest (26 testes)
npm run test:coverage
```

Estrutura em camadas **MVC**: `src/models` (dados), `src/views` (interface), `src/controllers` (orquestração), orientada por serviços e provedores de LLM plugáveis.

---

## 👤 Autor

- **@inneobr** — `inneobr@gmail.com`

## 📄 Licença

**MIT** — consulte [LICENSE](LICENSE) para os detalhes completos.

---

<div align="center">

**Feito com 💜 para seus documentos.**<br>
`npm install -g @inneobr/zora` e comece agora.

</div>