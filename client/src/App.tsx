import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AgentLayout } from "./agent/AgentLayout";
import Home from "./pages/Home";
import BlueprintDetail from "./pages/BlueprintDetail";
import AtsResumeStudio from "./pages/AtsResumeStudio";
import MockInterview from "./pages/MockInterview";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AgentLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Home />} />
                <Route path="/blueprints" element={<BlueprintDetail />} />
                <Route path="/resume-studio" element={<AtsResumeStudio />} />
                <Route path="/mock-interview" element={<MockInterview />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </AgentLayout>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
