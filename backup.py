import datetime
import os
import shutil
import zipfile

PASTA_BASE = "database"
PASTA_BACKUPS = "backups"


def listar_backups():
    if not os.path.isdir(PASTA_BACKUPS):
        return []
    return sorted(f for f in os.listdir(PASTA_BACKUPS) if f.endswith(".zip"))


def salvar_backup():
    if not os.path.isdir(PASTA_BASE) or not os.listdir(PASTA_BASE):
        return "Nada a salvar (base vazia ou inexistente)."
    os.makedirs(PASTA_BACKUPS, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    caminho = os.path.join(PASTA_BACKUPS, f"backup_{timestamp}.zip")
    with zipfile.ZipFile(caminho, "w", zipfile.ZIP_DEFLATED) as z:
        for raiz, _, arquivos in os.walk(PASTA_BASE):
            for arq in arquivos:
                completo = os.path.join(raiz, arq)
                z.write(completo, os.path.relpath(completo, "."))
    return f"Backup salvo em {caminho}"


def restaurar_backup(escolhido=None):
    backups = listar_backups()
    if not backups:
        return "Nenhum backup encontrado em backups/."

    if not escolhido:
        print("Backups disponíveis:")
        for i, b in enumerate(backups, 1):
            print(f"  {i}) {b}")
        opcao = input("Escolha um número: ").strip()
        if not opcao.isdigit() or not (1 <= int(opcao) <= len(backups)):
            return "Cancelado."
        escolhido = backups[int(opcao) - 1]

    caminho = os.path.join(PASTA_BACKUPS, escolhido)
    if not os.path.isfile(caminho):
        return f"Backup não encontrado: {caminho}"

    confirma = input(
        f"Substituir a base atual pelo backup {escolhido}? (sim): "
    ).strip().lower()
    if confirma != "sim":
        return "Cancelado."

    if os.path.isdir(PASTA_BASE):
        shutil.rmtree(PASTA_BASE)
    with zipfile.ZipFile(caminho) as z:
        z.extractall(".")
    return f"Base restaurada de {escolhido}."