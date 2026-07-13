import { motion } from "framer-motion"
import { ArrowRight, Bot, Target, FileSearch } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full bg-gradient-to-b from-background to-muted/20">
      <div className="container px-4 md:px-6 flex flex-col items-center text-center space-y-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 max-w-3xl"
        >
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Powered by RAG & Large Language Models
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Nail Your Next Interview with <span className="text-primary">AI Intelligence</span>
          </h1>
          <p className="text-xl text-muted-foreground md:px-10">
            Upload your resume and job description. Let our recruiter-grade AI analyze your ATS score, identify skill gaps, and conduct realistic mock interviews.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link to="/dashboard">
            <Button size="lg" className="h-12 px-8 text-lg rounded-full group">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Feature Section */}
      <div className="container px-4 py-16 grid gap-8 md:grid-cols-3 max-w-5xl">
        <FeatureCard 
          icon={<FileSearch className="h-10 w-10 text-primary" />}
          title="ATS Optimization"
          description="Instant analysis of your resume against target job descriptions to identify missing keywords and boost your score."
          delay={0.3}
        />
        <FeatureCard 
          icon={<Bot className="h-10 w-10 text-primary" />}
          title="Resume Q&A (RAG)"
          description="Chat with your resume. Our AI retrieves context perfectly to answer recruiter questions about your specific experience."
          delay={0.4}
        />
        <FeatureCard 
          icon={<Target className="h-10 w-10 text-primary" />}
          title="Mock Interviews"
          description="Interactive, personalized interview practice based strictly on your uploaded resume and the role you want."
          delay={0.5}
        />
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="p-6 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center space-y-4"
    >
      <div className="p-3 bg-primary/10 rounded-full">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </motion.div>
  )
}
