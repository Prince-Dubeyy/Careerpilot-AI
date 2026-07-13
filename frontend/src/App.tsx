import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Navbar } from "./components/layout/Navbar"
import { LandingPage } from "./pages/LandingPage"
import { Dashboard } from "./pages/Dashboard"
import { ResumeChat } from "./pages/ResumeChat"
import { MockInterview } from "./pages/MockInterview"

import { ThemeProvider } from "./components/theme-provider"

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Router>
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<ResumeChat />} />
              <Route path="/interview" element={<MockInterview />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
