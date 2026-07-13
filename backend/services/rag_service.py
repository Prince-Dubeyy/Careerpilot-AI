import os
import json
from dotenv import load_dotenv

load_dotenv()

_embeddings_instance = None

def get_embeddings():
    global _embeddings_instance
    if _embeddings_instance is None:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        _embeddings_instance = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings_instance

# Global dict to hold user FAISS index
vector_stores = {}

def process_document(file_path: str, doc_id: str):
    """Parses a document (PDF/DOCX), chunks it, embeds it, and stores in FAISS."""
    if file_path.endswith('.pdf'):
        from langchain_community.document_loaders import PyPDFLoader
        loader = PyPDFLoader(file_path)
    elif file_path.endswith('.docx'):
        from langchain_community.document_loaders import Docx2txtLoader
        loader = Docx2txtLoader(file_path)
    else:
        raise ValueError("Unsupported file format")

    documents = loader.load()
    return _chunk_and_store(documents, doc_id)

def process_text_document(text: str, doc_id: str):
    """Processes raw text (e.g., Job Description paste) and stores in FAISS."""
    from langchain_core.documents import Document
    documents = [Document(page_content=text, metadata={"source": "pasted_text"})]
    return _chunk_and_store(documents, doc_id)

def _chunk_and_store(documents, doc_id: str):
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import FAISS
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    
    chunks = text_splitter.split_documents(documents)
    
    # Create FAISS vector store from chunks using lazy-loaded embeddings
    vector_store = FAISS.from_documents(chunks, get_embeddings())
    
    # Store it in our simple in-memory dict
    vector_stores[doc_id] = vector_store
    
    return len(chunks)

def get_rag_chain(doc_id: str):
    """Returns a RAG chain based on the document's vector store."""
    from langchain_groq import ChatGroq
    from langchain_classic.chains import create_retrieval_chain
    from langchain_classic.chains.combine_documents import create_stuff_documents_chain
    from langchain_core.prompts import ChatPromptTemplate
    
    if doc_id not in vector_stores:
        raise ValueError("Document not found or not processed yet.")
        
    vector_store = vector_stores[doc_id]
    retriever = vector_store.as_retriever(search_kwargs={"k": 5})
    
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model_name="llama-3.1-8b-instant", 
        temperature=0.2
    )
    
    # Define a prompt for RAG
    system_prompt = (
        "You are an expert AI Career Advisor and Interview Copilot. "
        "Use the following pieces of retrieved context to answer the question. "
        "The context strictly contains the user's resume or job description details. "
        "Adapt your advice to whatever role (Data Analyst, Software Engineer, Cloud Architect, etc) the context implies. "
        "If the user asks about missing skills, explicitly identify them and advise: 'You should learn these skills and mention them in your resume.' "
        "Do not hallucinate any skills, experiences, or projects that are not in the context.\n\n"
        "Context: {context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)
    
    return rag_chain

def _extract_full_text(doc_id: str) -> str:
    if doc_id not in vector_stores:
        return ""
    docs = vector_stores[doc_id].docstore._dict.values()
    return " ".join([doc.page_content for doc in docs])

def analyze_ats_match(resume_id: str, jd_id: str) -> dict:
    """Compare resume and JD to calculate ATS score and explicitly list missing skills."""
    from langchain_groq import ChatGroq
    
    resume_text = _extract_full_text(resume_id)
    jd_text = _extract_full_text(jd_id)
    
    if not resume_text or not jd_text:
        raise ValueError("Both Resume and JD must be processed first.")
    
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model_name="llama-3.1-8b-instant", 
        temperature=0.1
    )
    
    prompt = f"""
    You are an expert, highly strict ATS (Applicant Tracking System) and Senior Technical Recruiter.
    Your task is to accurately and genuinely analyze the following Resume against the given Job Description.
    Do NOT inflate the score. Be highly critical.
    
    SCORING RUBRIC (BE EXTREMELY STRICT):
    - 0-30: Poor match. The resume lacks core required skills and experience entirely.
    - 31-60: Average match. Missing several key skills or sufficient domain experience.
    - 61-80: Good match. Has most core skills but lacks a few specific tools.
    - 81-100: Excellent match. Almost perfectly aligns with all requirements and experience levels.
    
    Resume:
    {resume_text[:4000]}
    
    Job Description:
    {jd_text[:4000]}
    
    Provide a detailed JSON response exactly in this format, without any markdown formatting. Replace the placeholders with your genuine evaluation:
    {{
      "ats_score": <Calculate an integer between 0 and 100 based on the strict rubric>,
      "missing_keywords": ["List any missing skills or tools..."],
      "match_percentage": <Same as ats_score>,
      "strengths": ["List genuine strengths..."],
      "weaknesses": ["You should learn these skills and mention them in your resume: <missing skills>"]
    }}
    
    Ensure that under 'weaknesses', you explicitly mention the missing key skills and prompt the user to "learn these skills and mention them in your resume".
    Return ONLY valid JSON.
    """
    
    response = llm.invoke(prompt)
    try:
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        return json.loads(content)
    except Exception as e:
        # Fallback in case of weird formatting
        print("JSON parsing failed, returning raw response", response.content)
        return {
            "ats_score": 0,
            "missing_keywords": ["Error parsing AI response"],
            "match_percentage": 0,
            "strengths": [],
            "weaknesses": [response.content]
        }

def generate_interview_questions(resume_id: str, jd_id: str) -> list:
    """Generates 5 interview questions based on the specific resume and JD."""
    from langchain_groq import ChatGroq
    
    resume_text = _extract_full_text(resume_id)
    jd_text = _extract_full_text(jd_id)
    
    if not resume_text:
        raise ValueError("Resume must be uploaded to generate questions.")
        
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model_name="llama-3.1-8b-instant", 
        temperature=0.3
    )
    
    prompt = f"""
    You are an expert Technical Interviewer for ANY role.
    Based on the following Resume and Job Description (if provided), generate exactly 5 specific interview questions.
    The questions should be a mix of technical deep-dives into the candidate's listed projects/skills, and behavioral scenarios.
    
    Resume:
    {resume_text[:4000]}
    
    Job Description:
    {jd_text[:4000]}
    
    Return the response as a valid JSON array of strings, without markdown formatting. Example:
    [
      "Tell me about a time you...",
      "How did you implement X in your Y project?",
      "Can you explain your experience with Z?"
    ]
    Return ONLY a valid JSON array of exactly 5 strings. Do not include any other text.
    """
    
    response = llm.invoke(prompt)
    try:
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        parsed = json.loads(content)
        if isinstance(parsed, dict) and "questions" in parsed:
            parsed = parsed["questions"]
        return parsed if isinstance(parsed, list) else []
    except Exception as e:
        print("Failed to parse questions JSON", e)
        return [
            "Could you tell me more about your recent project?",
            "What was the most challenging technical problem you solved?",
            "How do your skills match the job description?",
            "Can you explain your previous experience?",
            "Where do you see yourself in 5 years?"
        ]

def evaluate_interview_answers(resume_id: str, jd_id: str, questions: list, answers: list) -> dict:
    """Evaluates the interview answers based on the resume and JD."""
    from langchain_groq import ChatGroq
    
    resume_text = _extract_full_text(resume_id)
    jd_text = _extract_full_text(jd_id)
    
    if not resume_text:
        raise ValueError("Resume must be uploaded to evaluate answers.")
        
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model_name="llama-3.1-8b-instant", 
        temperature=0.2
    )
    
    qa_pairs = ""
    for i, (q, a) in enumerate(zip(questions, answers)):
        qa_pairs += f"Question {i+1}: {q}\nAnswer {i+1}: {a}\n\n"
        
    prompt = f"""
    You are an expert Technical Interviewer and Career Coach.
    Evaluate the candidate's answers to the following interview questions.
    Use their Resume and the Job Description as context to check for accuracy, relevance, and depth.
    
    Resume:
    {resume_text[:3000]}
    
    Job Description:
    {jd_text[:3000]}
    
    Interview Q&A:
    {qa_pairs}
    
    Provide a detailed JSON response exactly in this format, without markdown formatting:
    {{
      "overall_score": <Integer from 0-100>,
      "overall_feedback": "General genuine feedback...",
      "detailed_analysis": [
        {{
          "question": "Question 1 text...",
          "feedback": "Genuine feedback for question 1...",
          "score": <Integer from 0-100>
        }}
      ]
    }}
    Return ONLY valid JSON.
    """
    
    response = llm.invoke(prompt)
    try:
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        return json.loads(content)
    except Exception as e:
        print("Failed to parse evaluation JSON", e)
        return {
            "overall_score": 0,
            "overall_feedback": "Failed to evaluate answers due to an internal error.",
            "detailed_analysis": []
        }

def transcribe_audio(file_path: str) -> str:
    """Transcribes an audio file using Groq's Whisper API."""
    from groq import Groq
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    try:
        with open(file_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(file_path), file.read()),
                model="whisper-large-v3-turbo",
                response_format="text",
            )
        return str(transcription)
    except Exception as e:
        print(f"Transcription failed: {e}")
        return ""

def evaluate_single_answer(resume_id: str, jd_id: str, question: str, answer: str) -> dict:
    """Evaluates a single interview answer strictly."""
    from langchain_groq import ChatGroq
    
    resume_text = _extract_full_text(resume_id)
    jd_text = _extract_full_text(jd_id)
    
    if not resume_text:
        raise ValueError("Resume must be uploaded to evaluate answers.")
        
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model_name="llama-3.1-8b-instant", 
        temperature=0.1
    )
    
    prompt = f"""
    You are an expert Senior Data Scientist, Senior ML Engineer, and Senior Technical Recruiter.
    Evaluate the candidate's answer to the following interview question.
    Use their Resume and the Job Description as context to check for accuracy, relevance, and depth.
    
    Resume:
    {resume_text[:3000]}
    
    Job Description:
    {jd_text[:3000]}
    
    Question: {question}
    Answer: {answer}
    
    CRITICAL AUTOMATIC FAILURE RULES:
    1. If the answer is less than 3 words (e.g. "ok", "yes", "ji", "hello", "done", "good"), nonsense, empty, or completely irrelevant, the score MUST NOT exceed 20/100.
    2. If the answer is extremely generic and shows no real technical depth or fails to relate back to their resume/experience when applicable, penalize the score heavily (Maximum 50/100). Do NOT inflate scores for generic textbook definitions.
    
    SCORING RUBRIC (BE EXTREMELY STRICT AND GENUINE):
    1. Relevance (30%): Does the answer actually address the specific nuances of the question?
    2. Technical Accuracy (25%): Are the concepts correct and practically sound?
    3. Completeness (20%): Does the answer cover key points thoroughly?
    4. Communication (15%): Is it clear, professional, and well-structured?
    5. Examples & Depth (10%): Are real examples from their resume or deep technical nuances included?
    
    SCORING TARGETS:
    Excellent (Deeply technical, perfect match): 85-100
    Good (Solid understanding, mostly correct): 70-84
    Average (Basic understanding, lacking depth): 50-69
    Weak (Generic, partially incorrect): 25-49
    Poor/Filler (Nonsense, empty, completely wrong): 0-24
    
    Provide a detailed JSON response EXACTLY in this format, without markdown formatting:
    {{
      "score": <Integer from 0 to 100 based strictly on rubric>,
      "strengths": ["List of strengths..."],
      "weaknesses": ["List of weaknesses..."],
      "feedback": "Detailed genuine feedback focusing on why they received this score...",
      "ideal_answer_points": ["Point 1", "Point 2"]
    }}
    Return ONLY valid JSON.
    """
    
    response = llm.invoke(prompt)
    try:
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        return json.loads(content)
    except Exception as e:
        print("Failed to parse evaluation JSON", e)
        return {
            "score": 0,
            "strengths": [],
            "weaknesses": ["System failed to evaluate answer properly."],
            "feedback": "Failed to evaluate answer due to an internal error.",
            "ideal_answer_points": []
        }

def generate_final_report(resume_id: str, jd_id: str, qa_history: list) -> dict:
    """Generates a final comprehensive report based on all evaluated questions."""
    from langchain_groq import ChatGroq
    
    resume_text = _extract_full_text(resume_id)
    
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model_name="llama-3.1-8b-instant", 
        temperature=0.2
    )
    
    history_text = ""
    for i, item in enumerate(qa_history):
        history_text += f"Q{i+1}: {item['question']}\nA{i+1}: {item['answer']}\nScore: {item['score']}\nFeedback: {item['feedback']}\n\n"
        
    prompt = f"""
    You are an expert Senior Recruiter. Based on the following interview history, generate a final interview report for the candidate.
    
    Resume Context:
    {resume_text[:2000]}
    
    Interview History:
    {history_text}
    
    Provide a detailed JSON response EXACTLY in this format, without markdown formatting:
    {{
      "overall_score": <Calculate integer 0-100>,
      "average_score": <Calculate average integer 0-100>,
      "strengths": ["List of overall strengths..."],
      "weaknesses": ["List of overall weaknesses..."],
      "areas_to_improve": ["Area 1", "Area 2"],
      "recommended_learning_topics": ["Topic 1", "Topic 2"]
    }}
    Return ONLY valid JSON.
    """
    
    response = llm.invoke(prompt)
    try:
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        return json.loads(content)
    except Exception as e:
        print("Failed to parse final report JSON", e)
        # Calculate a basic average score fallback
        scores = [item.get("score", 0) for item in qa_history]
        avg = sum(scores) / len(scores) if scores else 0
        return {
            "overall_score": avg,
            "average_score": avg,
            "strengths": [],
            "weaknesses": ["System failed to generate full report."],
            "areas_to_improve": [],
            "recommended_learning_topics": []
        }

