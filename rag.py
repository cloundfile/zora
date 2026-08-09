import argparse
import os
import sys

import ollama

from backup import listar_backups, restaurar_backup, salvar_backup
from ollama_setup import garantir_ollama
from seletor import escolher_arquivo
from treinador import importar_documento

MODELO_PADRAO = "qwen2.5"
PASTA_BASE = "database"
NOME_COLECAO = "documento"
MODELO = MODELO_PADRAO

PROMPT = """
Você é o Assistente Pessoal de Pesquisa, seu nome é Zora.
Use o seguinte contexto para responder a questão, não use nenhuma informação adicional, se não houver informação no contexto responsa: Desculpe mas não consigo ajudar.
Quando for listagens retorne em formato lista: exemplo * Mesa de escritorio R$: 1.500,00 ou * João da Silva 20 faltas, etc.
Sempre termine a resposta com: Mais alguma duvida?
e finalize com: "Zora é uma IA e pode cometer erros"
"""


def get_modelo():
    return MODELO


def get_collection():
    import chromadb

    client = chromadb.PersistentClient(path=PASTA_BASE)
    return client.get_or_create_collection(name=NOME_COLECAO)


def cmd_status(args):
    col = get_collection()
    total = col.count()
    print(f"Total de chunks na base: {total}")
    if total > 0:
        dados = col.get()
        por_arquivo = {}
        for m in dados["metadatas"]:
            arq = (m or {}).get("arquivo", "(desconhecido)")
            por_arquivo[arq] = por_arquivo.get(arq, 0) + 1
        for arq, n in sorted(por_arquivo.items()):
            print(f"  {arq}: {n} chunk(s)")


def cmd_treinar(args):
    col = get_collection()
    arquivo = args.arquivo
    if not arquivo:
        print("Abrindo seletor de arquivo...")
        arquivo = escolher_arquivo()
        if not arquivo:
            print("Nenhum arquivo selecionado.")
            return
    print(importar_documento(col, arquivo))


def cmd_perguntar(args):
    col = get_collection()
    data = col.query(query_texts=args.pergunta, n_results=args.chunks)
    resposta_base = "".join(data["documents"][0]).strip()
    if not resposta_base:
        print("Não há contexto na base para essa pergunta.")
        return

    completion = ollama.chat(
        model=get_modelo(),
        messages=[
            {"role": "system", "content": PROMPT},
            {
                "role": "user",
                "content": f"Contexto:\n{resposta_base}\n\nPergunta: {args.pergunta}",
            },
        ],
    )
    print(completion["message"]["content"])


def cmd_limpar(args):
    if not args.force:
        confirma = input("Apagar TODOS os dados da base? (sim): ").strip().lower()
        if confirma != "sim":
            print("Cancelado.")
            return
    import shutil

    if os.path.isdir(PASTA_BASE):
        shutil.rmtree(PASTA_BASE)
    print("Base apagada.")


def cmd_backup(args):
    print(salvar_backup())


def cmd_restaurar(args):
    print(restaurar_backup(args.backup))


def repl():
    col = get_collection()
    os.system("clear")
    while True:
        question = input("\nQual sua duvida? ").strip()
        if not question:
            continue
        comando = question.lower()
        if comando == "sair":
            print("Encerrando...")
            break
        if comando == "help":
            print("\nComandos disponíveis:")
            print("  * (sair) - encerra o programa")
            print("  * (help) - mostra esta ajuda")
            print("  * (treinar) - importa um documento .txt ou .pdf")
            print("  qualquer outra pergunta sera processada pelo assistente")
            continue
        if comando == "treinar":
            print("importando dados")
            arquivo = escolher_arquivo()
            print(importar_documento(col, arquivo))
            continue
        os.system("clear")
        print("Pensando...")
        data = col.query(query_texts=question, n_results=2)
        resposta_base = "".join(data["documents"][0])
        completion = ollama.chat(
            model=get_modelo(),
            messages=[
                {"role": "system", "content": PROMPT},
                {
                    "role": "user",
                    "content": f"Contexto:\n{resposta_base}\n\nPergunta: {question}",
                },
            ],
        )
        resposta = completion["message"]["content"]
        if resposta:
            os.system("clear")
            print(resposta)


def main():
    global MODELO
    MODELO = garantir_ollama()

    parser = argparse.ArgumentParser(
        prog="rag", description="Assistente Pessoal de Pesquisa"
    )
    sub = parser.add_subparsers(dest="comando")

    p_treinar = sub.add_parser("treinar", help="importa um documento .txt/.pdf na base")
    p_treinar.add_argument("arquivo", nargs="?", help="caminho do arquivo (se omitido, abre popup)")
    p_treinar.set_defaults(func=cmd_treinar)

    p_perguntar = sub.add_parser("perguntar", help="faz uma pergunta ao assistente")
    p_perguntar.add_argument("pergunta", help="a pergunta entre aspas")
    p_perguntar.add_argument("-n", "--chunks", type=int, default=2, help="quantos chunks de contexto usar (padrão 2)")
    p_perguntar.set_defaults(func=cmd_perguntar)

    p_status = sub.add_parser("status", help="mostra o que está na base")
    p_status.set_defaults(func=cmd_status)

    p_limpar = sub.add_parser("limpar", help="apaga toda a base")
    p_limpar.add_argument("-f", "--force", action="store_true", help="não pede confirmação")
    p_limpar.set_defaults(func=cmd_limpar)

    p_backup = sub.add_parser("backup", help="salva um backup da base")
    p_backup.set_defaults(func=cmd_backup)

    p_restaurar = sub.add_parser("restaurar", help="restaura um backup")
    p_restaurar.add_argument("backup", nargs="?", help="nome do backup .zip (se omitido, mostra menu)")
    p_restaurar.set_defaults(func=cmd_restaurar)

    args = parser.parse_args()
    if args.comando == "perguntar" and not args.pergunta:
        parser.error("o argumento 'pergunta' é obrigatório")
    if args.comando is None:
        repl()
    else:
        args.func(args)


if __name__ == "__main__":
    main()