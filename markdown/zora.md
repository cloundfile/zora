# Prompt de Desenvolvimento: CLI Zora (RAG Local + Extrator de CNPJ + Multi-LLM + SQLite Vetorizado)

Você deve atuar como um Engenheiro de Software Senior TypeScript. Sua tarefa é criar uma aplicação CLI global open-source em Node.js/npm chamada **Zora** (pacote `@inneobr/zora`), sob a **licença MIT**, desenvolvida por **@inneobr** (`inneobr@gmail.com`), descrita como **"Zora, seu assistente pessoal"**.

O sistema executa um pipeline de RAG (Retrieval-Augmented Generation) com suporte a múltiplos provedores de LLM (Ollama local ou provedores online via API), SQLite Vetorizado, gerenciamento de sessões, exportação de datasets para fine-tuning, tratamento robusto de erros, backups automáticos e uma suíte completa de testes automatizados com Vitest.

---

## 1. Informações do Pacote e Publicação

### Metadados (`package.json`)
- **Nome do Pacote:** `@inneobr/zora`
- **Desenvolvedor / Autor:** `@inneobr` (<inneobr@gmail.com>)
- **Descrição:** `Zora, seu assistente pessoal`
- **Licença:** `MIT`
- **Keywords / Tags:** `zora`, `assistente`, `ferramenta`, `documentos`, `dataset`, `fine-tuning`
- **Binário Executável:** `zora`
- **Scripts NPM:**
  - `"build": "tsc"`
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"test:coverage": "vitest run --coverage"`
- **Arquivos Publicados (`files` no package.json ou `.npmignore`):**
  - Publica apenas `dist/`, `README.md` e `LICENSE`.
  - Oculta `.env`, `tests/`, `src/` e a pasta `backups/`.

---

### Checagem Automática de Versão (Executado no Startup)
Toda vez que qualquer comando `zora` for executado no terminal:
1. O CLI faz uma verificação assíncrona da versão local instalada em relação à versão mais recente publicada no registro NPM (`@inneobr/zora`).
2. Se houver uma nova versão disponível, exibe um aviso amigável no topo do terminal:
   > `💡 Uma nova versão do Zora está disponível! Atualize executando: npm install -g @inneobr/zora`
3. A execução do comando prossegue normalmente sem travar a experiência do usuário.

---

## 2. Fluxo de Instalação e Setup Inicial (1º uso)

Ao executar o Zora pela primeira vez:
1. **Verificação da LLM Local (Ollama):**
   - O CLI verifica se o **Ollama** está ativo em `http://localhost:11434`.
   - **Se o Ollama NÃO estiver ativo/instalado:**
     - Exibe aviso informando que o Ollama é o requisito recomendado.
     - Solicita autorização do usuário para instalar o Ollama automaticamente.
     - **Se a autorização for NEGADA:**
       - Pede para o usuário selecionar a LLM online desejada: **Gemini**, **Claude** (Anthropic) ou **ChatGPT** (OpenAI).
       - Solicita a chave de API (`api_key`) do provedor selecionado e faz uma chamada de teste.
     - **Se o Ollama for ACEITO:**
       - Instala/garante execução do Ollama e verifica se há algum modelo de chat ativo.
       - Se não houver modelo baixado, solicita a escolha de um modelo (`gemma`, `mistral`, `llama3`) e executa o `ollama pull`.
2. **Persistência das Configurações:**
   - Salva o provedor escolhido, modelo, autor e chave de API no arquivo de configuração local do usuário (`~/.zorarc`).

---

## 3. Comandos da CLI

1. **`zora`**:
   - Inicia ou retoma a sessão ativa do RAG e abre o chat interativo.
   - Trata buscas diretas de CNPJ (com consulta local e fallback para API da Receita Federal/fila de reprocessamento).
   - Aplica **guardrail rígido**: se a resposta não estiver fundamentada nos documentos ingeridos, responde exatamente:
     > `"Não posso ajudar com essa questão."`

2. **`zora config`**:
   - Menu interativo para alterar e gerenciar as configurações do sistema salvas em `~/.zorarc`.
   - Permite alterar entre provedor **Local** (`ollama`) e **Online** (`gemini`, `claude`, `openai`).
   - Permite adicionar, testar ou trocar as chaves de API (`apiKey`) dos provedores cloud.
   - Permite escolher ou alterar o modelo ativado (ex: `gemma`, `llama3`, `gpt-4o`, `gemini-2.5-flash`).

3. **`zora sections`**:
   - Exibe um menu interativo no terminal listando todas as seções salvas (ID, data de criação e prévia da mensagem).
   - Permite que o usuário selecione uma seção existente para continuar a conversa a partir daquele contexto.

4. **`zora dataset`**:
   - Extrai todo o histórico de conversas de todas as seções (`session_messages`) e exporta em formato **JSONL** (`zora_dataset.jsonl`) estruturado no padrão `user` e `assistant`.
   - Útil para realizar **fine-tuning** e treinamento de novos modelos de linguagem (OpenAI, Ollama, Unsloth, Hugging Face).
   - Permite definir o caminho do arquivo de saída via flag `--output <path>` ou via janela popup nativa do SO.

5. **`zora reset`**:
   - Limpa o histórico de conversas (`sessions` e `session_messages`).
   - Não afeta os documentos treinados nem a base vetorizada. Inicia uma sessão de chat limpa.

6. **`zora delete <id>`**:
   - Elimina permanentemente a seção de conversa correspondente ao `<id>` e suas mensagens associadas.
   - Inicia uma nova sessão limpa de chat automaticamente.

7. **`zora kill`**:
   - **Purga Crítica de Dados:** Limpa **todas** as tabelas do banco de dados e **apaga todos os arquivos** da pasta `<zora_root>/backups/`.
   - **Alerta e Confirmação OBRIGATÓRIA:** Exibe um alerta vermelho destacado avisando que a ação é **IRREVOGÁVEL** e que os dados só poderão ser restaurados caso o usuário possua um backup externo. Exige que o usuário digite a confirmação textual explícita `CONFIRMAR`.

8. **`zora treinamentos`**:
   - Abre popup visual nativo do SO para escolha de arquivos (`.pdf`, `.txt`, `.json`).
   - Armazena o original como `BLOB` e extrai o texto.
   - Divide o texto em chunks de **500 caracteres**, gera embeddings e salva referências.
   - Vincula CNPJs encontrados e permite adicionar mais dados em loop.

9. **`zora exportar`**:
   - Abre popup nativo do SO ("Salvar Como") e exporta uma cópia bruta do banco SQLite (`.db`).

10. **`zora restore`**:
    - Abre popup nativo para selecionar um arquivo `.db` e restaura a base de dados.

11. **`zora version`** (ou `zora -v` / `zora --version`):
    - Exibe no terminal as informações do pacote (`@inneobr/zora`), desenvolvedor (`@inneobr`), e-mail (`inneobr@gmail.com`), licença (`MIT`) e dados do SO/Node.js.

12. **`zora help`**:
    - Exibe o menu de ajuda com todos os comandos, parâmetros e exemplos.

---

## 4. Tech Stack Recomendada

- **Linguagem & Runtime:** TypeScript, Node.js (v20+)
- **CLI & Interatividade:** `commander`, `prompts` ou `inquirer`, `chalk`
- **Banco de Dados:** SQLite (`better-sqlite3`) com suporte a vetores (`sqlite-vec`)
- **LLM & Embeddings:**
  - Local: `ollama` SDK oficial
  - Cloud Fallbacks: `@google/genai` (Gemini), `@anthropic-ai/sdk` (Claude), `openai` (ChatGPT)
- **Processamento de Arquivos:** `pdf-parse`, leitores nativos de `fs`
- **Popups Nativos:** `nfd` ou `zenity-ui`
- **Testes & Cobertura:** `vitest`, `@vitest/coverage-v8`

---

## 5. Arquitetura de Dados

### Configuração do Usuário (`~/.zorarc`)
```json
{
  "provider": "ollama | gemini | claude | openai",
  "apiKey": "string_se_online",
  "model": "gemma",
  "developer": "@inneobr",
  "contact": "inneobr@gmail.com",
  "license": "MIT"
}