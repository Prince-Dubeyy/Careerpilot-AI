# Dependency Audit

## Current State
The `requirements.txt` file is heavily bloated with packages that are either implicitly installed, no longer needed, or belong to development tools that shouldn't be deployed to Render.

## Dependencies to Remove or Downgrade
1. **`scikit-learn` & `scipy`**: Massive scientific computing packages that aren't used directly (mostly implicit to other ML packages, but we don't need them globally declared).
2. **`langgraph` & `networkx`**: Not used in our specific RAG implementation (we use standard Langchain LCEL).
3. **`sympy`**: Heavy math library usually pulled in by PyTorch, not needed directly.
4. **`transformers`, `tokenizers`, `torch`**: These are required for `sentence-transformers`, but we should rely on `sentence-transformers` to pull the exact sub-dependencies it needs rather than explicitly pinning versions that might be mismatched.
5. **`filelock`, `greenlet`, `joblib`, `mpmath`**: Implicit dependencies.

## Cleaned Requirements
We only need to explicitly define our direct dependencies. This vastly reduces image size and dependency resolution time on Render.

- `fastapi`
- `uvicorn`
- `python-multipart`
- `pydantic`
- `python-dotenv`
- `groq`
- `langchain`
- `langchain-groq`
- `langchain-community`
- `sentence-transformers`
- `faiss-cpu`
- `pypdf`
- `docx2txt`
