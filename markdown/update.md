Este documento registra as últimas alterações de arquitetura, novos comandos e tratamentos de integridade implementados no assistente **Zora**.

---

## 🌟 Resumo das Novidades

| Recurso | Tipo | Descrição |
| :--- | :--- | :--- |
| **`zora config`** | Novo Comando | Menu interativo para alternar entre LLM Local (Ollama) e Cloud (Gemini, Claude, OpenAI), além de gerenciar chaves de API e modelos. |
| **Deduplicação de Documentos** | Melhoria de Integridade | Validação via **SHA-256** (`file_hash`) antes de realizar a leitura, chunking e vetorização do documento. |
| **Deduplicação de CNPJ** | Melhoria de Integridade | Uso de `PRIMARY KEY` na tabela `companies` e chave composta em `document_cnpjs`, evitando chamadas repetidas a APIs externas. |
| **CNPJ Alfanumérico (2026)** | Suporte & Resiliência | Atualização da expressão regular para suporte ao novo padrão alfanumérico e tratamento amigável de limites de APIs gratuitas. |

---

## 🔍 Detalhamento das Alterações

### 1. Menu Interativo de Configuração (`zora config`)
Foi adicionado o comando `zora config` para permitir a gestão das preferências salvas em `~/.zorarc` sem a necessidade de redefinir todo o setup do CLI.
* **Provedor:** Alternância simples entre `ollama` (Local) e provedores online (`gemini`, `claude`, `openai`).
* **API Keys:** Inserção, edição e validação de chaves de API para serviços cloud.
* **Modelos:** Troca do modelo ativo (ex: `gemma`, `llama3`, `gpt-4o`, `gemini-2.5-flash`).

### 2. De-duplicação de Arquivos e Prevenção de Treinamento Duplicado
Para evitar desperdício de processamento, geração desnecessária de embeddings e poluição da base vetorizada:
* **Hash SHA-256:** Cada arquivo selecionado via `zora treinamentos` tem seu conteúdo verificado antes do processamento.
* **Aviso de Duplicidade:** Caso a hash já esteja cadastrada na coluna `file_hash` da tabela `documents`, o CLI ignora o arquivo e exibe:
  > `⚠️ Documento "<nome>" já foi treinado anteriormente. Operação ignorada.`

### 3. Suporte ao CNPJ Alfanumérico (Padrão Receita Federal)
Ajuste no serviço de identificação e busca de dados cadastrais de empresas:
* **Regex Misto:** `([A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/\d{4}-\d{2})|([A-Z0-9]{14})`
* **Fallback Amigável (`src/services/cnpjService.ts`):** Identifica a raiz do documento com caracteres alfabéticos. Se as APIs públicas gratuitas (como ReceitaWS) falharem ao processar o formato alfanumérico, o sistema registra um aviso sem interromper a execução:
  > `⚠️ O CNPJ "XX.XXX.XXX/0001-XX" utiliza o novo formato Alfanumérico. Consultas para este padrão ainda não estão disponíveis/estabilizadas nas APIs gratuitas da Receita Federal.`

---

## 🗄️ Alterações no Banco de Dados (`SQLite`)

As tabelas do schema foram atualizadas para suportar as restrições de unicidade:

```sql
-- 1. Inclusão de file_hash UNIQUE em documents
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_hash TEXT UNIQUE NOT NULL,
    mime_type TEXT NOT NULL,
    full_text TEXT NOT NULL,
    original_blob BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Chave Primária Composta em document_cnpjs
CREATE TABLE IF NOT EXISTS document_cnpjs (
    document_id TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    PRIMARY KEY(document_id, cnpj),
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY(cnpj) REFERENCES companies(cnpj) ON DELETE CASCADE
);