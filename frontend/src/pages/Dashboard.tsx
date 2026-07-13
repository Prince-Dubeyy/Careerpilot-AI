import { useState, useEffect } from "react"
import { UploadCloud, FileText, Briefcase, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

import { uploadResume, uploadJD, analyzeATS } from "@/lib/api"

export function Dashboard() {
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jdText, setJdText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [error, setError] = useState("")

  // Load existing data on mount if any
  useEffect(() => {
    const savedJd = localStorage.getItem("jd_text")
    if (savedJd) setJdText(savedJd)
  }, [])

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
    }
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError("")
    setAnalysisResult(null)

    try {
      // 1. Upload Resume
      if (!resumeFile) throw new Error("Please select a resume file")
      const resumeResponse = await uploadResume(resumeFile)
      const resumeId = resumeResponse.doc_id
      localStorage.setItem("resume_id", resumeId)

      // 2. Upload JD
      if (!jdText.trim()) throw new Error("Please paste a job description")
      const jdResponse = await uploadJD(jdText)
      const jdId = jdResponse.doc_id
      localStorage.setItem("jd_id", jdId)
      localStorage.setItem("jd_text", jdText)

      // 3. Analyze
      const result = await analyzeATS(resumeId, jdId)
      
      setAnalysisResult({
        score: result.ats_score || 0,
        matchPercentage: result.match_percentage || 0,
        missingKeywords: result.missing_keywords || [],
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || []
      })
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to analyze. Make sure backend is running.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Upload your materials to get AI-powered insights.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Resume Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>Resume</span>
            </CardTitle>
            <CardDescription>Upload your resume in PDF or DOCX format</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center space-y-4 hover:bg-muted/50 transition-colors relative">
              <div className="p-4 bg-primary/10 rounded-full">
                <UploadCloud className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">PDF or DOCX</p>
              </div>
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                accept=".pdf,.docx" 
                onChange={handleResumeUpload}
              />
              <Button variant="outline" className="pointer-events-none">
                Select File
              </Button>
              {resumeFile && (
                <div className="flex items-center space-x-2 text-sm text-green-600 font-medium z-10 bg-background px-2 py-1 rounded">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{resumeFile.name} uploaded</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* JD Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <span>Job Description</span>
            </CardTitle>
            <CardDescription>Paste the target job description text</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Paste job description here..." 
              className="min-h-[220px] resize-none"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-destructive bg-destructive/10 p-4 rounded-md">
           <AlertCircle className="w-5 h-5" />
           <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="flex justify-center">
        <Button 
          size="lg" 
          className="w-full md:w-1/3 h-12 text-lg" 
          onClick={handleAnalyze}
          disabled={!resumeFile || !jdText.trim() || isAnalyzing}
        >
          {isAnalyzing ? "Analyzing with AI..." : "Run ATS Analysis"}
        </Button>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>ATS Match Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="relative w-32 h-32 flex items-center justify-center bg-primary/10 rounded-full">
                <span className="text-4xl font-bold text-primary">{analysisResult.score}</span>
              </div>
              <p className="text-center text-muted-foreground text-sm">
                Score based on keyword matching and semantic relevance.
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                  Missing Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.missingKeywords.length > 0 ? analysisResult.missingKeywords.map((kw: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                      {kw}
                    </span>
                  )) : <span className="text-sm text-muted-foreground">No critical missing keywords!</span>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-green-600">Strengths</h4>
                  <ul className="list-disc pl-5 text-sm space-y-2 text-muted-foreground">
                    {analysisResult.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-orange-500">Action Plan</h4>
                  <ul className="list-disc pl-5 text-sm space-y-2 text-muted-foreground">
                    {analysisResult.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
