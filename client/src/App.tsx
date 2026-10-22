import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AvatarCalibrate from "./pages/AvatarCalibrate";
import AvatarTest from "./pages/AvatarTest";
import { DASStudioLayout } from "./avatar/DASStudioLayout";
import { DasVoiceProvider } from "./context/DasVoiceContext";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/das-agent"} component={DASStudioLayout} />
      <Route path={"/avatar-calibrate"} component={AvatarCalibrate} />
      <Route path={"/avatar-test"} component={AvatarTest} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

import { DASVoiceProvider } from "./contexts/DASVoiceContext";
import { DASGlobalDock } from "./components/voice/DASGlobalDock";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <DASVoiceProvider>
            <DasVoiceProvider>
              <Router />
              <DASGlobalDock />
            </DasVoiceProvider>
          </DASVoiceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
