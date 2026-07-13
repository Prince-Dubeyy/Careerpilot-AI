import { Link } from "react-router-dom"
import { Briefcase } from "lucide-react"
import { ModeToggle } from "../mode-toggle"

export function Navbar() {
  return (
    <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">CareerPilot AI</span>
        </Link>
        <div className="flex items-center space-x-6 text-sm font-medium">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link to="/chat" className="text-muted-foreground hover:text-foreground transition-colors">
            Resume Chat
          </Link>
          <Link to="/interview" className="text-muted-foreground hover:text-foreground transition-colors">
            Mock Interview
          </Link>
          <ModeToggle />
        </div>
      </div>
    </nav>
  )
}
