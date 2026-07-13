# AI Career & Interview Copilot

## Project Overview

AI Career & Interview Copilot is a production-ready, RAG-powered platform designed to help job seekers optimize their resumes, identify skill gaps, and practice for interviews. By leveraging cutting-edge Large Language Models (LLMs) and Vector Databases, it provides deeply contextualized career intelligence.

## Business Problem

Job seekers frequently struggle with tailoring their resumes to specific Applicant Tracking Systems (ATS), understanding exactly what skills they lack for their dream roles, and preparing for technical or behavioral interviews. Traditional tools offer generic advice, but a personalized, context-aware AI can drastically improve a candidate's success rate.

## Features

- **Resume & Job Description Upload**: Parses PDF and DOCX files automatically.
- **ATS Resume Analysis**: Generates an ATS score, missing keywords, and skill match percentages.
- **Skill Gap Analysis**: Compares the user's resume against a job description to identify missing tools, technologies, and certifications.
- **Resume Q&A (RAG)**: Chat with your resume. The AI answers strictly based on your uploaded experience without hallucinations.
- **Mock Interview Mode**: Interactive interview sessions evaluating answers and providing immediate feedback.

## AI Architecture

The platform is built on a modern AI stack using **Retrieval-Augmented Generation (RAG)** to ensure responses are grounded in user data.

## RAG Pipeline

1. **Document Upload**: Users upload Resumes (PDF/DOCX).
2. **Text Extraction**: Text is extracted using PyPDF2 / Docx2txt.
3. **Chunking**: The document is split into manageable chunks using LangChain's `RecursiveCharacterTextSplitter`.
4. **Embeddings**: Chunks are converted into dense vector embeddings using `sentence-transformers/all-MiniLM-L6-v2`.
5. **Vector Database**: Embeddings are stored in a local FAISS index for high-speed similarity search.
6. **Retriever & LLM**: When a user asks a question, the relevant chunks are retrieved from FAISS and injected into the Groq LLM prompt.

## LLM Integration

We use **Groq** for lightning-fast inference, specifically utilizing the `Llama 3` model to parse ATS matches, answer career queries, and generate interview questions based on the retrieved context.

## Embeddings

**Embeddings** are mathematical representations of text. By converting text to vectors, we can mathematically determine which parts of a resume are most relevant to a specific user question. We use `all-MiniLM-L6-v2`, a lightweight and highly efficient model for this task.

## Vector Database

**FAISS** (Facebook AI Similarity Search) is used as our vector database. It efficiently clusters and searches dense vectors, allowing our backend to instantly retrieve the most relevant resume chunks in milliseconds.

## Tech Stack

**Frontend:**
- React (Vite)
- TypeScript
- Tailwind CSS
- ShadCN UI
- Framer Motion

**Backend:**
- FastAPI (Python)
- LangChain
- Groq API (Llama 3)
- FAISS & Sentence Transformers

## Project Structure

```
.
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   └── index.css
│   └── package.json
├── backend/
│   ├── services/
│   │   └── rag_service.py
│   ├── main.py
│   └── requirements.txt
└── README.md
```

## Installation

### Prerequisites
- Node.js v18+
- Python 3.10+

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

## Usage Guide

1. Navigate to the local frontend URL (usually `http://localhost:5173`).
2. Go to the Dashboard and upload a Resume (PDF/DOCX) and paste a Job Description.
3. Click "Run ATS Analysis" to see your score and missing keywords.
4. Navigate to "Resume Chat" to ask questions directly to your resume context.
5. Go to "Mock Interview" for an interactive practice session.

## Deployment

- **Frontend**: Ready to be deployed on [Vercel](https://vercel.com). Just connect the GitHub repository and set the root directory to `frontend`.
- **Backend**: Ready to be deployed on [Render](https://render.com). Set the root directory to `backend`, use the python environment, and set the start command to `uvicorn main:app --host 0.0.0.0 --port $PORT`.

## Skills Demonstrated

This project showcases production-level expertise in:
- **Generative AI & LLM Integration** (Groq, Llama 3)
- **Retrieval-Augmented Generation (RAG)**
- **Prompt Engineering**
- **Vector Databases & Embeddings** (FAISS, Sentence Transformers)
- **NLP & Document Parsing**
- **Full Stack Development** (React, TypeScript, FastAPI)
- **Production Deployment** (Vercel, Render ready)

## Future Improvements

- Add OAuth Authentication (Clerk/Auth0).
- Persist Vector Stores to cloud databases (Pinecone/Weaviate).
- Implement audio transcription for voice-based mock interviews.

---
*Built to demonstrate practical, recruiter-ready AI Engineering skills.*
