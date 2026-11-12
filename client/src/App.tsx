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
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Home />} />
              <Route
                path="/blueprints"
                element={
                  <AgentLayout>
                    <BlueprintDetail />
                  </AgentLayout>
                }
              />
              <Route
                path="/resume-studio"
                element={
                  <AgentLayout>
                    <AtsResumeStudio />
                  </AgentLayout>
                }
              />
              <Route
                path="/mock-interview"
                element={
                  <AgentLayout>
                    <MockInterview />
                  </AgentLayout>
                }
              />
              <Route path="*" element={<Home />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
