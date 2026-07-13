import psutil
import os
def p(name):
    mem = psutil.Process(os.getpid()).memory_info().rss / (1024*1024)
    print(f"{name}: {mem:.2f} MB")

p("Baseline")
from langchain_groq import ChatGroq; p("langchain_groq")
from langchain_community.embeddings import HuggingFaceEmbeddings; p("HuggingFaceEmbeddings_import")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2"); p("HuggingFaceEmbeddings_load")
