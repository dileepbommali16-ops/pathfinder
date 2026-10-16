import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-2xl border border-[#161926] bg-[#11131c] backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#9f1239]/10 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-[#9f1239]" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-[#f8fafc] mb-2">404</h1>

          <h2 className="text-xl font-semibold text-[#f8fafc] mb-4">
            Page Not Found
          </h2>

          <p className="text-[#94a3b8] mb-8 leading-relaxed">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="bg-white hover:bg-zinc-200 active:bg-zinc-300 text-zinc-950 font-medium px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
