# Zora — Assistente Pessoal de Pesquisa

Assistente de IA local (RAG) que aprende a partir dos seus documentos (`.txt` e `.pdf`) e responde perguntas com base somente no conteúdo que você forneceu.

- **100% local**: documentos e banco ficam na sua máquina, sem envio para a nuvem.
- **Sem custo de API**: usa [Ollama](https://ollama.com) para rodar o LLM localmente.
- **Multiplataforma**: instaladores para Linux (`.deb`/`.rpm`) e Windows (`.exe`).

---

## Como funciona

O Zora usa a técnica de **RAG** (*Retrieval-Augmented Generation*):

1. **Treinar** — você importa documentos; o texto é dividido em *chunks* (pedaços) e indexado no banco vetorial local [ChromaDB](https://www.trychroma.com).
2. **Perguntar** — ao fazer uma pergunta, o Zora busca no banco os trechos mais relacionados ao assunto (*retrieval*).
3. **Responder** — o contexto encontrado é enviado ao LLM (Ollama), que gera a resposta com base **apenas** no seu conteúdo (*generation*).

Nenhum documento sai da sua máquina e o modelo de IA também roda nela.

---

## Instalação

### Linux (.deb / .rpm)

```bash
# Debian/Ubuntu
sudo dpkg -i zora_*.deb

# Fedora/RHEL
sudo rpm -i zora-*.rpm
```

### Windows (.exe)

Execute `zora-installer.exe` (instala em `%LOCALAPPDATA%\Zora` e adiciona `zora` ao PATH do terminal).

### Primeira execução

Na primeira vez, o Zora verifica sua máquina:

- **Ollama não está instalado** → instala automaticamente e baixa o LLM **Qwen 2.5**.
- **Ollama já instalado** → usa o modelo disponível como padrão.

---

## Uso

Digite `zora` em um terminal:

```bash
zora
```

### Modo interativo (REPL)

```bash
$ zora

Qual sua duvida? help

Comandos disponíveis:
  * (sair) - encerra o programa
  * (help) - mostra esta ajuda
  * (treinar) - importa um documento .txt ou .pdf

Qual sua duvida?
```

### Comandos

| Comando | Descrição |
| --- | --- |
| `zora treinar [arquivo]` | Importa um documento na base (abre seletor se omitir o arquivo) |
| `zora perguntar "sua pergunta" [-n N]` | Faz uma pergunta ao assistente |
| `zora status` | Mostra o que está na base |
| `zora limpar [-f]` | Apaga toda a base |
| `zora backup` | Salva um backup da base em `backups/` |
| `zora restaurar [backup]` | Restaura um backup salvo |

### Exemplos

```bash
# Treinar um documento
zora treinar relatorio.pdf

# Perguntar
zora perguntar "Qual o total de gastos do relatorio?"

# Perguntar usando mais contexto
zora perguntar "Quais fornecedores aparecem?" -n 5

# Ver o que já foi treinado
zora status

# Backup
zora backup
```

---

## Comportamento com a IA

O assistente segue regras rígidas ao responder:

- Usa **somente** o contexto presente na base — se não houver informação, responde *"Desculpe mas não consigo ajudar."*
- **Listagens** são retornadas em formato de lista.
- Conclui o texto perguntando *"Mais alguma duvida?"* e finaliza com um aviso de que a resposta foi gerada por IA.

---

## Estrutura do projeto

```
├── rag.py               # CLI principal e modo interativo
├── treinador.py         # Leitura de arquivos, chunks e indexação
├── seletor.py           # Selector de arquivo (GUI/home/terminal)
├── backup.py            # Backup e restauração da base
├── ollama_setup.py      # Verifica/instala Ollama e define o modelo LLM
├── conversor.py         # Script utilitário de importação
├── database/            # Banco vetorial local (ChromaDB) — criado na 1ª execução
├── backups/             # Backups gerados pelo comando `backup`
├── scripts/             # Scripts usados pelos instaladores
│   ├── after-install.sh # Define variáveis de ambiente no Linux
│   └── zora.nsi         # Instalador NSIS do Windows
└── .github/workflows/   # CI: gera instaladores e Releases
```

> **Nota:** `database/` e `backups/` são gerados localmente e **não** são enviados ao git.

---

## Build automático (GitHub Actions)

Ao enviar um commit para a branch `main`, o CI:

1. Gera um binário com PyInstaller.
2. Empacota **`.deb`** e **`.rpm`** (Linux) e o instalador **`.exe`** (Windows com NSIS).
3. Publica uma **nova Release no GitHub** com os 3 instaladores para cada commit.

Também é possível disparar manualmente em **Actions → Build Installers → Run workflow**.

---

## Desenvolvimento local

```bash
# Ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Dependências
pip install -e .

# Executar
zora
```

Requer Python 3.10+ e [Ollama](https://ollama.com/download) (instalado automaticamente na 1ª execução, se ausente).