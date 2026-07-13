# Render Memory Audit

## Root Cause
The Render Free Tier allocates 512MB of RAM. The backend currently exceeds this limit instantly on startup because of how dependencies and models are loaded in `services/rag_service.py`.

Specifically, `sentence-transformers`, `torch`, `faiss`, and `HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")` are being initialized globally when the module loads. PyTorch alone consumes ~200-300MB upon import, and loading the model weights pushes the memory usage over 500MB before the web server can even start accepting connections.

## Memory-Heavy Components
1. **PyTorch (`torch`)**: Massive framework dependency required by `sentence-transformers`.
2. **`HuggingFaceEmbeddings`**: Preloads the `all-MiniLM-L6-v2` transformer model weights.
3. **`FAISS`**: Dense vector indexing system.
4. **`transformers` library**: Base framework for LLMs and embeddings.

## Startup Memory Estimate (Current vs Target)
- **Current Startup Memory Estimate**: ~550MB+ (crashes instantly)
- **Target Startup Memory Estimate**: < 100MB (only FastAPI, Uvicorn, Langchain core, and Groq SDK)

## Runtime Memory Estimate (Post-Fix)
- **Idle/ATS Scoring/Mock Interview**: < 150MB (No embeddings required, 100% Groq-powered)
- **Resume Chat / Document Upload**: ~400-480MB (PyTorch and Embedding models are JIT-loaded during upload)

## Optimization Opportunities
1. **Lazy Loading**: Delay all ML model instantiation (`get_embeddings_model()`) until explicitly invoked by `/api/upload`.
2. **Deferred Imports**: Move `import torch`, `from langchain_community.embeddings...`, and `import faiss` inside the specific RAG functions.
3. **Decouple ATS and Interview**: The ATS scoring and Mock Interview evaluation do NOT use embeddings (they use Groq Chat). By deferring PyTorch imports, these features will use virtually zero extra memory.
4. **Global Singleton**: Ensure only one embedding model is ever loaded in memory during runtime if a user uploads a resume.
