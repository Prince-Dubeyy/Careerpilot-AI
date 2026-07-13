import axios from "axios";

const API_BASE = "http://localhost:8000/api";

export const uploadResume = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", "resume");
  
  const response = await axios.post(`${API_BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const uploadJD = async (text: string) => {
  const response = await axios.post(`${API_BASE}/upload-text`, {
    text,
    doc_type: "jd"
  });
  return response.data;
};

export const analyzeATS = async (resumeId: string, jdId: string) => {
  const response = await axios.post(`${API_BASE}/analyze-ats`, {
    resume_id: resumeId,
    jd_id: jdId
  });
  return response.data;
};

export const chatWithResume = async (docId: string, message: string) => {
  const response = await axios.post(`${API_BASE}/chat`, {
    doc_id: docId,
    message
  });
  return response.data;
};

export const generateInterviewQuestions = async (resumeId: string, jdId: string = "") => {
  const response = await axios.post(`${API_BASE}/interview/generate`, {
    resume_id: resumeId,
    jd_id: jdId
  });
  return response.data;
};

export const evaluateInterview = async (resumeId: string, jdId: string = "", questions: string[], answers: string[]) => {
  const response = await axios.post(`${API_BASE}/interview/evaluate`, {
    resume_id: resumeId,
    jd_id: jdId,
    questions,
    answers
  });
  return response.data;
};

export const transcribeAudio = async (audioBlob: Blob) => {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  
  const response = await axios.post(`${API_BASE}/interview/transcribe`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const evaluateQuestion = async (resumeId: string, jdId: string = "", question: string, answer: string) => {
  const response = await axios.post(`${API_BASE}/interview/evaluate-question`, {
    resume_id: resumeId,
    jd_id: jdId,
    question,
    answer
  });
  return response.data;
};

export const evaluateFinalReport = async (resumeId: string, jdId: string = "", qaHistory: any[]) => {
  const response = await axios.post(`${API_BASE}/interview/evaluate-final`, {
    resume_id: resumeId,
    jd_id: jdId,
    qa_history: qaHistory
  });
  return response.data;
};
