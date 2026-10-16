import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    if (
      typeof window !== "undefined" &&
      (error.message?.includes("Failed to fetch dynamically imported module") ||
       error.message?.includes("Loading chunk"))
    ) {
      const retryKey = "pathfinder_chunk_err_retry";
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, Date.now().toString());
        window.location.reload();
      }
    }
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-[#141318] text-[#eae6e0]">
          <div className="flex flex-col items-center w-full max-w-2xl p-8 rounded-3xl border border-white/[0.08] bg-[#1c1a22] shadow-2xl">
            <AlertTriangle
              size={48}
              className="text-[#c76f3b] mb-6 flex-shrink-0"
            />

            <h2 className="text-xl font-bold mb-4 text-[#eae6e0]">An unexpected error occurred.</h2>

            <div className="p-4 w-full rounded-2xl bg-[#141318] border border-white/[0.08] overflow-auto mb-6">
              <pre className="text-xs text-[#938e87] whitespace-break-spaces">
                {this.state.error?.message || this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.reload();
              }}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs",
                "bg-[#c76f3b] text-white",
                "hover:bg-[#8c3a2e] active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(199, 111, 59,0.3)] transition-all"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
