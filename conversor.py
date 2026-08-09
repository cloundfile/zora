import chromadb
import os
from seletor import escolher_arquivo
from treinador import importar_documento

print("Assistente Pessoal de Pesquisa 1.0")

chromadb_client = chromadb.Client()
chromadb_client = chromadb.PersistentClient(path="database")
collection = chromadb_client.get_or_create_collection(name="documento")

arquivo = escolher_arquivo()
if arquivo is None:
    print("Nenhum arquivo selecionado. Encerrando.")
    exit()

os.system("clear")
print("Importando:", arquivo)
print(importar_documento(collection, arquivo))