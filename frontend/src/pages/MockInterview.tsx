import { useState, useEffect, useRef } from "react";
import { Play, Mic, Square, CheckCircle, Target, AlertCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { generateInterviewQuestions, evaluateQuestion, evaluateFinalReport, transcribeAudio } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";

export function MockInterview() {
  const [questions, setQuestions] = useState<string[]>([])
  const [currentQ, setCurrentQ] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [jdId, setJdId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Per-question evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<any>(null);
  const [qaHistory, setQaHistory] = useState<any[]>([]);
  
  // Final report state
  const [finalReport, setFinalReport] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    setResumeId(localStorage.getItem("resume_id"))
    setJdId(localStorage.getItem("jd_id"))
  }, []);

  const startInterview = async () => {
    if (!resumeId) return;
    setIsLoading(true);
    setError("");
    setSessionExpired(false);
    setQaHistory([]);
    setCurrentAnswer("");
    setCurrentEvaluation(null);
    try {
      const result = await generateInterviewQuestions(resumeId, jdId || "");
      if (result.questions && result.questions.length > 0) {
        setQuestions(result.questions);
        setHasStarted(true);
      } else {
        throw new Error("Failed to generate questions");
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.status === 400) {
        setSessionExpired(true);
        setError("Your session has expired or your resume was lost on the server. Please re-upload your resume.");
      } else {
        setError("Could not generate interview questions. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        try {
          const result = await transcribeAudio(audioBlob);
          if (result.text) {
            const finalAnswer = currentAnswer + (currentAnswer ? " " : "") + result.text;
            setCurrentAnswer(finalAnswer);
            // Automatically evaluate after voice transcription
            await handleEvaluate(finalAnswer);
          }
        } catch (err) {
          console.error("Transcription failed", err);
          setError("Failed to transcribe audio. You can manually type your answer and click Submit.");
        } finally {
          setIsTranscribing(false);
        }
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
      setError("Microphone access denied or not available. You can type your answer instead.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleEvaluate = async (answerText: string) => {
    if (!answerText.trim() || !resumeId) return;
    
    setIsEvaluating(true);
    setError("");
    try {
      const result = await evaluateQuestion(resumeId, jdId || "", questions[currentQ], answerText);
      setCurrentEvaluation(result);
    } catch (err) {
      console.error(err);
      setError("Failed to evaluate answer. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextQuestion = async () => {
    if (!currentEvaluation) return;

    const updatedHistory = [
      ...qaHistory, 
      { 
        question: questions[currentQ], 
        answer: currentAnswer, 
        score: currentEvaluation.score, 
        feedback: currentEvaluation.feedback 
      }
    ];
    setQaHistory(updatedHistory);
    setCurrentAnswer("");
    setCurrentEvaluation(null);
    setError("");
    
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setIsFinished(true);
      await generateFinalReport(updatedHistory);
    }
  };
  
  const generateFinalReport = async (history: any[]) => {
    if (!resumeId) return;
    setIsGeneratingReport(true);
    try {
      const result = await evaluateFinalReport(resumeId, jdId || "", history);
      setFinalReport(result);
    } catch (err) {
      console.error(err);
      setError("Failed to generate final report.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER BLOCKS
  // -------------------------------------------------------------

  if (!resumeId) {
    return (
      <div className="container mx-auto p-6 max-w-4xl flex flex-col justify-center items-center py-16">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Resume Found</h2>
        <p className="text-muted-foreground mb-6">Please upload your resume in the dashboard first to generate an interview.</p>
        <Link to="/dashboard">
           <Button>Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  if (!hasStarted && !isFinished) {
    return (
      <div className="container mx-auto p-6 max-w-3xl flex flex-col items-center justify-center py-16 space-y-6 text-center">
        <div className="p-6 bg-primary/10 rounded-full mb-4">
          <Target className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">AI Mock Interview</h1>
        <p className="text-xl text-muted-foreground max-w-xl">
          Practice your interview skills with an AI recruiter. We will evaluate your answers strictly in real-time.
        </p>
        
        {error && (
          <div className="text-destructive bg-destructive/10 p-3 rounded-md font-medium text-sm w-full max-w-md">
            {error}
          </div>
        )}

        {sessionExpired ? (
          <Button size="lg" className="h-14 px-8 text-lg rounded-full" onClick={() => navigate("/dashboard")}>
            Upload Resume
          </Button>
        ) : (
          <Button size="lg" className="h-14 px-8 text-lg rounded-full" onClick={startInterview} disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Questions...</>
            ) : (
              <><Play className="mr-2 fill-current w-5 h-5" /> Start Interview</>
            )}
          </Button>
        )}
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="container mx-auto p-6 max-w-4xl flex flex-col py-8 space-y-8 animate-in zoom-in duration-500">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-6 bg-green-500/10 rounded-full mb-2">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Interview Complete!</h1>
        </div>
        
        {isGeneratingReport ? (
           <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium text-lg">Generating your final interview report...</p>
           </div>
        ) : finalReport ? (
           <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="border-2 shadow-md">
                    <CardHeader className="text-center pb-2">
                       <CardTitle className="text-xl text-muted-foreground">Overall Score</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pb-8">
                       <div className="text-6xl font-bold text-primary mb-2">{finalReport.overall_score}<span className="text-3xl text-muted-foreground">/100</span></div>
                       <p className="text-sm text-muted-foreground">Average Score: {finalReport.average_score}/100</p>
                    </CardContent>
                 </Card>
                 
                 <Card className="shadow-md bg-muted/20">
                    <CardHeader>
                       <CardTitle className="text-lg">Strengths & Weaknesses</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div>
                         <h4 className="font-semibold text-green-600 mb-1 flex items-center"><CheckCircle className="w-4 h-4 mr-2" /> Strengths</h4>
                         <ul className="list-disc pl-5 text-sm space-y-1">
                           {finalReport.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                         </ul>
                       </div>
                       <div>
                         <h4 className="font-semibold text-destructive mb-1 flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> Areas to Improve</h4>
                         <ul className="list-disc pl-5 text-sm space-y-1">
                           {finalReport.areas_to_improve?.map((w: string, i: number) => <li key={i}>{w}</li>)}
                         </ul>
                       </div>
                    </CardContent>
                 </Card>
              </div>
              
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">Recommended Learning Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 text-sm space-y-2">
                    {finalReport.recommended_learning_topics?.map((topic: string, idx: number) => (
                      <li key={idx} className="font-medium">{topic}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              <h3 className="text-2xl font-bold mt-8 mb-4">Question History</h3>
              <div className="space-y-6">
                 {qaHistory.map((item: any, idx: number) => (
                    <Card key={idx} className="shadow-sm">
                       <CardHeader className="bg-muted/30 border-b py-4">
                          <CardTitle className="text-lg leading-relaxed flex justify-between items-start">
                             <span className="mr-4">Q{idx + 1}: {item.question}</span>
                             <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-bold ${
                               item.score >= 80 ? 'bg-green-100 text-green-700' :
                               item.score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                             }`}>
                               Score: {item.score}/100
                             </span>
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="pt-6">
                          <div className="mb-4">
                             <h4 className="font-semibold text-sm text-muted-foreground mb-1">Your Answer:</h4>
                             <p className="text-sm bg-muted/20 p-3 rounded-md">{item.answer || "No answer provided."}</p>
                          </div>
                          <div>
                             <h4 className="font-semibold text-sm text-muted-foreground mb-1">AI Feedback:</h4>
                             <p className="text-sm">{item.feedback}</p>
                          </div>
                       </CardContent>
                    </Card>
                 ))}
              </div>
              
              <div className="flex justify-center pt-6">
                 <Button size="lg" onClick={() => { setHasStarted(false); setIsFinished(false); setCurrentQ(0); setFinalReport(null); setQaHistory([]); }}>
                   Start Another Session
                 </Button>
              </div>
           </div>
        ) : (
           <div className="text-center text-destructive">Failed to load final report.</div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8 py-8">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold">Question {currentQ + 1} of {questions.length}</h2>
        <span className="text-sm font-medium text-muted-foreground">{Math.round((currentQ / questions.length) * 100)}% Complete</span>
      </div>
      <Progress value={(currentQ / questions.length) * 100} className="h-2" />

      {error && !sessionExpired && (
        <div className="text-destructive bg-destructive/10 p-4 rounded-md font-medium text-sm flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          {error}
        </div>
      )}

      <Card className="border-2 shadow-lg relative overflow-hidden">
        {isRecording && (
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
        )}
        <CardHeader className="pb-6 pt-10 px-10">
          <CardTitle className="text-2xl leading-relaxed">
            "{questions[currentQ]}"
          </CardTitle>
        </CardHeader>
        
        <CardContent className="px-10 pb-8 flex flex-col items-center">
           {!currentEvaluation && (
             <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 mb-6 ${
               isRecording ? 'bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.4)]' : 'bg-muted'
             }`}>
               {isTranscribing || isEvaluating ? (
                 <Loader2 className="w-10 h-10 text-primary animate-spin" />
               ) : (
                 <Mic className={`w-10 h-10 ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
               )}
             </div>
           )}
           
           <div className="w-full relative">
              <Textarea 
                placeholder={isRecording ? "Recording... Click Stop when you are done." : isTranscribing ? "Transcribing your audio..." : isEvaluating ? "Evaluating your answer..." : "Type your answer here or use the Record button."} 
                className={`min-h-[120px] text-base p-4 resize-none transition-all ${isTranscribing || isEvaluating || currentEvaluation ? 'opacity-70 bg-muted/30' : ''}`}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                disabled={isTranscribing || isEvaluating || currentEvaluation !== null}
              />
           </div>
           
           {/* Per-Question Feedback Display */}
           {currentEvaluation && (
             <div className="w-full mt-6 p-6 border rounded-lg bg-muted/10 animate-in fade-in duration-300">
               <div className="flex justify-between items-center mb-4 pb-4 border-b">
                 <h3 className="text-lg font-bold">Evaluation Result</h3>
                 <span className={`px-4 py-1.5 rounded-full font-bold text-lg ${
                   currentEvaluation.score >= 80 ? 'bg-green-100 text-green-700' :
                   currentEvaluation.score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                 }`}>
                   Score: {currentEvaluation.score}/100
                 </span>
               </div>
               <p className="text-sm font-medium mb-2">Feedback:</p>
               <p className="text-sm text-muted-foreground mb-4">{currentEvaluation.feedback}</p>
               
               {currentEvaluation.ideal_answer_points && currentEvaluation.ideal_answer_points.length > 0 && (
                 <div>
                   <p className="text-sm font-medium mb-1 text-primary">Key points you should have mentioned:</p>
                   <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                     {currentEvaluation.ideal_answer_points.map((p: string, i: number) => <li key={i}>{p}</li>)}
                   </ul>
                 </div>
               )}
             </div>
           )}
        </CardContent>
        
        <CardFooter className="bg-muted/30 px-10 py-6 border-t flex justify-between items-center">
          {!currentEvaluation ? (
             <>
                {isRecording ? (
                  <Button variant="destructive" size="lg" className="w-32 rounded-full animate-pulse" onClick={stopRecording}>
                    <Square className="mr-2 w-4 h-4 fill-current" /> Stop
                  </Button>
                ) : (
                  <Button variant="outline" size="lg" className="w-32 rounded-full" onClick={startRecording} disabled={isTranscribing || isEvaluating}>
                    <Mic className="mr-2 w-4 h-4" /> Record
                  </Button>
                )}
                
                {/* Hide Next/Submit while recording as requested */}
                {!isRecording && (
                  <Button variant="default" size="lg" onClick={() => handleEvaluate(currentAnswer)} disabled={(!currentAnswer.trim() && !isRecording) || isTranscribing || isEvaluating}>
                    <Send className="mr-2 w-4 h-4" /> Submit Answer
                  </Button>
                )}
             </>
          ) : (
             <>
               <div /> {/* Spacer to push Next button to the right */}
               <Button variant="default" size="lg" onClick={nextQuestion}>
                 {currentQ < questions.length - 1 ? "Next Question" : "Finish Interview"}
               </Button>
             </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
