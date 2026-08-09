import hashlib
from pypdf import PdfReader


def ler_documento(arquivo):
    if arquivo.lower().endswith(".pdf"):
        reader = PdfReader(arquivo)
        texto = ""
        for page in reader.pages:
            texto += page.extract_text()
    else:
        with open(arquivo, "r", encoding="utf-8") as f:
            texto = f.read()
    return texto


def hash_documento(texto):
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def get_chunks(text, size=1000, overlap=200):
    if size <= overlap:
        raise ValueError("Chunk menor que o overlap")

    chunks = []
    inicio = 0
    while inicio < len(text):
        final = inicio + size
        chunks.append(text[inicio:final])
        inicio = len(text) if final >= len(text) else inicio + size - overlap
    return chunks


def importar_documento(collection, arquivo):
    if not arquivo:
        return "Nenhum arquivo selecionado."

    try:
        texto = ler_documento(arquivo)
    except Exception as e:
        return f"Erro ao ler o arquivo: {e}"

    documento_hash = hash_documento(texto)
    nome = arquivo.split("/")[-1]

    duplicado = collection.get(where={"hash": documento_hash})
    if len(duplicado["ids"]) > 0:
        return f"Documento {nome} Já treinado. Nada foi adicionado."

    if len(texto) == 0:
        return "Documento vazio (nenhum texto extraído). Nada foi adicionado."

    chunks = get_chunks(texto)
    existentes = collection.count()
    for i, chunk in enumerate(chunks):
        collection.add(
            documents=chunk,
            ids=[str(existentes + i)],
            metadatas=[{"arquivo": nome, "hash": documento_hash}],
        )
    return f"{len(chunks)} chunks importados de {nome}. Total na base: {collection.count()}"