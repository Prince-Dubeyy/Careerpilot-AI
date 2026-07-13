import { useState, useEffect } from "react"
import { Send, User, Bot, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { chatWithResume } from "@/lib/api"
import { Link } from "react-router-dom"

type Message = {
  role: "user" | "assistant"
  content: string
}

export function ResumeChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I have analyzed your uploaded resume. What would you like to know about your experience, or what career advice do you need?" }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resumeId, setResumeId] = useState<string | null>(null)

  useEffect(() => {
    setResumeId(localStorage.getItem("resume_id"))
  }, [])

  const handleSend = async () => {
    if (!input.trim() || !resumeId) return

    const userMsg: Message = { role: "user", content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const result = await chatWithResume(resumeId, userMsg.content)
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: result.response 
      }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Make sure your resume is uploaded and the backend is running." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!resumeId) {
    return (
      <div className="container mx-auto p-6 max-w-4xl h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-8">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Resume Found</h2>
        <p className="text-muted-foreground mb-6">Please upload your resume in the dashboard first to start chatting.</p>
        <Link to="/dashboard">
           <Button>Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl h-[calc(100vh-4rem)] flex flex-col py-8">
      <Card className="flex-1 flex flex-col shadow-md overflow-hidden min-h-0">
        <CardHeader className="border-b bg-muted/30 shrink-0">
          <CardTitle>Chat with your Resume</CardTitle>
          <CardDescription>RAG-powered conversational interface strictly grounded in your context.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col relative bg-card min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex space-x-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                   <div className="flex space-x-3 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-secondary text-secondary-foreground">
                        <Bot size={16} />
                      </div>
                      <div className="p-4 rounded-2xl text-sm bg-muted rounded-tl-none flex items-center space-x-2">
                         <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce"></div>
                         <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce delay-75"></div>
                         <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce delay-150"></div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t bg-background">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex space-x-2 max-w-3xl mx-auto">
              <Input 
                placeholder="Ask about your skills, projects, or career advice..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 rounded-full px-6"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="rounded-full w-10 h-10 shrink-0" disabled={!input.trim() || isLoading}>
                <Send size={18} />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
