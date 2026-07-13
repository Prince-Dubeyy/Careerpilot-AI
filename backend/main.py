import uuid
import os
import psutil
import logging
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from services.rag_service import process_document, process_text_document, get_rag_chain, analyze_ats_match, generate_interview_questions, evaluate_interview_answers, transcribe_audio, evaluate_single_answer, generate_final_report
from typing import Optional

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Career & Interview Copilot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_memory_usage():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

@app.on_event("startup")
async def startup_event():
    mem_mb = get_memory_usage()
    logger.info(f"🚀 Application Startup Complete. Initial Memory Usage: {mem_mb:.2f} MB")

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Career & Interview Copilot API"}

@app.get("/api/health")
def health_check():
    mem_mb = get_memory_usage()
    logger.info(f"Health Check Memory Usage: {mem_mb:.2f} MB")
    return {"status": "ok", "memory_mb": round(mem_mb, 2)}

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), doc_type: str = Form(...)):
    # doc_type could be 'resume'
    file_path = f"temp_{uuid.uuid4()}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    doc_id = str(uuid.uuid4())
    try:
        chunks = process_document(file_path, doc_id)
        return {"message": f"{doc_type} uploaded successfully", "doc_id": doc_id, "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

class TextUploadRequest(BaseModel):
    text: str
    doc_type: str

@app.post("/api/upload-text")
async def upload_text(request: TextUploadRequest):
    doc_id = str(uuid.uuid4())
    try:
        chunks = process_text_document(request.text, doc_id)
        return {"message": f"{request.doc_type} uploaded successfully", "doc_id": doc_id, "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ATSRequest(BaseModel):
    resume_id: str
    jd_id: str

@app.post("/api/analyze-ats")
async def analyze_ats(request: ATSRequest):
    try:
        result = analyze_ats_match(request.resume_id, request.jd_id)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

class ChatRequest(BaseModel):
    doc_id: str
    message: str

@app.post("/api/chat")
async def chat_resume(request: ChatRequest):
    try:
        rag_chain = get_rag_chain(request.doc_id)
        response = rag_chain.invoke({"input": request.message})
        return {"response": response["answer"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class InterviewRequest(BaseModel):
    resume_id: str
    jd_id: str = ""

@app.post("/api/interview/generate")
async def generate_interview(request: InterviewRequest):
    try:
        questions = generate_interview_questions(request.resume_id, request.jd_id)
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class EvaluateInterviewRequest(BaseModel):
    resume_id: str
    jd_id: str = ""
    questions: list[str]
    answers: list[str]

class EvaluateQuestionRequest(BaseModel):
    resume_id: str
    jd_id: str = ""
    question: str
    answer: str

class EvaluateFinalRequest(BaseModel):
    resume_id: str
    jd_id: str = ""
    qa_history: list[dict]

@app.post("/api/interview/evaluate")
async def evaluate_interview(request: EvaluateInterviewRequest):
    try:
        evaluation = evaluate_interview_answers(request.resume_id, request.jd_id, request.questions, request.answers)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/interview/evaluate-question")
async def evaluate_question(request: EvaluateQuestionRequest):
    try:
        evaluation = evaluate_single_answer(request.resume_id, request.jd_id, request.question, request.answer)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/interview/evaluate-final")
async def evaluate_final(request: EvaluateFinalRequest):
    try:
        report = generate_final_report(request.resume_id, request.jd_id, request.qa_history)
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/interview/transcribe")
async def transcribe_interview_audio(file: UploadFile = File(...)):
    file_path = f"temp_{uuid.uuid4()}_{file.filename}"
    try:
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        text = transcribe_audio(file_path)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
