import os
import shutil
import subprocess
import sys
import time

MODELO_PADRAO = "qwen2.5"


def e_modelo_cloud(nome):
    return nome.lower().endswith(":cloud")


def ollama_instalado():
    return shutil.which("ollama") is not None


def instalar_ollama():
    print("Ollama não encontrado na máquina. Instalando...")
    if sys.platform.startswith("linux"):
        subprocess.run(
            "curl -fsSL https://ollama.com/install.sh | sh",
            shell=True, check=True,
        )
    elif sys.platform == "win32":
        pasta = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "ollama")
        os.makedirs(pasta, exist_ok=True)
        instalador = os.path.join(pasta, "OllamaSetup.exe")
        subprocess.run(["curl.exe", "-L", "https://ollama.com/download/OllamaSetup.exe", "-o", instalador], check=True)
        subprocess.run([instalador, "/S"], check=True)


def ollama_rodando():
    try:
        subprocess.run(["ollama", "list"], capture_output=True, timeout=5)
        return True
    except Exception:
        return False


def iniciar_ollama():
    if ollama_rodando():
        return
    try:
        if sys.platform.startswith("linux"):
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        elif sys.platform == "win32":
            subprocess.Popen(
                ["cmd", "/c", "start", "ollama", "app"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
    except Exception:
        pass
    for _ in range(30):
        if ollama_rodando():
            return
        time.sleep(1)


def listar_modelos():
    try:
        out = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=10)
        if out.returncode != 0:
            return []
        modelos = []
        for linha in out.stdout.splitlines()[1:]:
            nome = linha.split()[0] if linha.strip() else ""
            if nome:
                modelos.append(nome)
        return modelos
    except Exception:
        return []


def baixar_modelo(nome):
    print(f"Baixando o LLM {nome}... (pode demorar)")
    subprocess.run(["ollama", "pull", nome], check=True)


def garantir_ollama():
    if not ollama_instalado():
        instalar_ollama()
        iniciar_ollama()
        baixar_modelo(MODELO_PADRAO)
        print(f"Modelo padrão definido: {MODELO_PADRAO}")
        return MODELO_PADRAO

    iniciar_ollama()
    modelos = [m for m in listar_modelos() if not e_modelo_cloud(m)]
    if MODELO_PADRAO in modelos:
        print(f"Ollama já instalado. Usando LLM padrão: {MODELO_PADRAO}")
        return MODELO_PADRAO
    if modelos:
        print(f"Ollama já instalado. Usando LLM disponível como padrão: {modelos[0]}")
        return modelos[0]

    baixar_modelo(MODELO_PADRAO)
    print(f"Modelo padrão definido: {MODELO_PADRAO}")
    return MODELO_PADRAO