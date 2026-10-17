import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Compass, Home, Bot, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "404 · Navigation Vector Lost · Pathfinder 2.0";
  }, []);

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0b10] p-4 text-[#f8fafc] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#7c3aed]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-[#9f1239]/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-lg mx-auto shadow-2xl border border-white/[0.08] bg-[#11131c]/90 backdrop-blur-2xl relative z-10 rounded-2xl">
        <CardContent className="pt-10 pb-10 px-6 sm:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#7c3aed]/20 rounded-full blur-xl animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#161926] to-[#1c2030] ring-1 ring-[#7c3aed]/40 shadow-lg">
                <Compass className="h-10 w-10 text-[#7c3aed] animate-spin" style={{ animationDuration: "20s" }} />
              </div>
            </div>
          </div>

          <div className="inline-block px-3 py-1 mb-3 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold tracking-wider uppercase">
            Error 404 · Route Uncharted
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#f8fafc] mb-3 font-['Space_Grotesk']">
            Navigation Vector Lost
          </h1>

          <p className="text-[#94a3b8] text-sm mb-8 leading-relaxed max-w-md mx-auto">
            The placement roadmap coordinate or dashboard node you are trying to access does not exist or has been relocated.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              className="bg-[#9f1239] hover:bg-[#881337] text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-[#9f1239]/25 cursor-pointer"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Executive Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="border-white/10 bg-[#161926] hover:bg-white/10 text-[#f8fafc] font-medium px-5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
