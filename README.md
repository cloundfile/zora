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
zora treinar                  # seleciona um ou vários documentos e treina em fila
zora treinar -p arquivo.pdf   # treina um documento específico
zora cnpj -p "59879501000132" # busca dados do CNPJ na Receita e treina
zora perguntar -p "pergunta"  # pergunta direta
zora status                   # o que já foi treinado
zora limpar                   # apaga o banco de dados
zora backup                   # cria backup
zora restaurar                # restaura backup
```

No seletor gráfico (zenity), use Ctrl + clique para escolher vários arquivos. Na navegação por terminal, digite o número de cada arquivo para marcar/desmarcar e `fim` para treinar a lista. Também dá para selecionar uma pasta inteira: o Zora pergunta se você quer treinar todos os arquivos dentro dela e, se confirmar, percorre tudo automaticamente.

## Desenvolvimento

```bash
npm run dev          # roda sem build
npm run typecheck    # checa tipos
npm run build        # gera dist/zora.cjs
```

## Licença

MIT
