# Zora

Assistente pessoal de pesquisa com RAG local. Treine documentos (.txt/.pdf) e faça perguntas respondidas por um LLM via Ollama.

## Instalação

### Global (recomendado)

```bash
npm install -g @inneobr/zora
zora
```

### Local (sem instalar no sistema)

```bash
npx @inneobr/zora
```

### A partir do código

```bash
git clone https://github.com/cloundfile/zora.git
cd zora
npm install
npm run build
node dist/zora.cjs
```

Requer Node.js >= 22 e Ollama (o CLI instala/inicia automaticamente).

## Comandos

```bash
zora                          # abre o chat
zora treinar -p arquivo.pdf   # treina um documento
zora perguntar -p "pergunta"  # pergunta direta
zora status                   # o que já foi treinado
zora limpar                   # apaga o banco de dados
zora backup                   # cria backup
zora restaurar                # restaura backup
```

## Desenvolvimento

```bash
npm run dev          # roda sem build
npm run typecheck    # checa tipos
npm run build        # gera dist/zora.cjs
```

## Licença

MIT
