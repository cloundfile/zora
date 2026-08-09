import os


def pasta_inicial():
    docs = os.path.join(os.path.expanduser("~"), "Documents")
    if os.path.isdir(docs):
        return docs
    home = os.path.expanduser("~")
    if os.path.isdir(home):
        return home
    return os.path.abspath(".")


def escolher_arquivo():
    inicio = pasta_inicial()
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        arquivo = filedialog.askopenfilename(
            title="Selecione o documento (.txt ou .pdf)",
            initialdir=inicio,
            filetypes=[("Documentos", "*.txt *.pdf"), ("Todos os arquivos", "*")],
        )
        root.destroy()
        if arquivo:
            return arquivo
    except Exception:
        pass
    try:
        import subprocess

        popup = subprocess.run(
            ["zenity", "--file-selection",
             "--title=Selecione o documento (.txt ou .pdf)",
             "--file-filter=Documentos | *.txt *.pdf",
             f"--filename={inicio}/"],
            capture_output=True, text=True, check=False,
        )
        if popup.returncode == 0 and popup.stdout.strip():
            return popup.stdout.strip()
    except Exception:
        pass
    return navegar(inicio)


def navegar(pasta_atual="."):
    pasta = os.path.abspath(pasta_atual)
    while True:
        os.system("clear")
        print(f"Selecione o documento (.txt ou .pdf)\nLocal: {pasta}\n")
        itens = sorted(
            os.listdir(pasta),
            key=lambda p: (not os.path.isdir(os.path.join(pasta, p)), p.lower()),
        )
        print("0) [subir uma pasta]")
        for i, item in enumerate(itens, 1):
            caminho = os.path.join(pasta, item)
            if os.path.isdir(caminho):
                print(f"{i}) [pasta] {item}/")
            else:
                print(f"{i}) {item}")
        opcao = input("\nDigite o número (ou 'sair'): ").strip().lower()
        if opcao == "sair":
            return None
        if not opcao.isdigit():
            continue
        idx = int(opcao)
        if idx == 0:
            pai = os.path.dirname(pasta)
            if pai != pasta:
                pasta = pai
            continue
        if 1 <= idx <= len(itens):
            caminho = os.path.join(pasta, itens[idx - 1])
            if os.path.isdir(caminho):
                pasta = caminho
            elif caminho.lower().endswith((".txt", ".pdf")):
                return caminho
            else:
                input("Formato não suportado. Use .txt ou .pdf. Enter para continuar...")