import { createRoot } from "react-dom/client";
import App from "./App";
import "@/auth/authListener";
import "./index.css";

// Auto-reload once on stale chunk dynamic import failure (common after new deployments)
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    console.warn("[Vite] Preload error detected, reloading to fetch latest assets:", event);
    const retryKey = "pathfinder_chunk_retry";
    if (!sessionStorage.getItem(retryKey)) {
      sessionStorage.setItem(retryKey, Date.now().toString());
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
