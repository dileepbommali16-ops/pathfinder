/**
 * Pathfinder 2.0 Centralized API Client
 * - Unified base URL resolution (env var VITE_API_BASE_URL -> cloud Render -> local FastAPI)
 * - Automatic Authorization: Bearer <token> injection
 * - 401 interception: clean logout and redirect event
 * - AbortController timeout and signal chaining
 * - Consistent response and error handling
 */

export const getApiBase = () => {
  if (typeof window !== "undefined") {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim()) return envUrl.replace(/\/+$/, "");
    if (
      window.location.hostname.includes("vercel.app") ||
      (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1")
    ) {
      if (window.location.hostname.includes("onrender.com")) {
        return window.location.origin;
      }
      return "https://pathfinder-backend-klrp.onrender.com";
    }
  }
  return "http://127.0.0.1:8000";
};

export const API_BASE = getApiBase();

export const getSessionId = () => {
  if (typeof window === "undefined") return "server_session";
  let sid = localStorage.getItem("pathfinder_session_id");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem("pathfinder_session_id", sid);
  }
  return sid;
};

export const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("pathfinder_token") : null;
  const sid = getSessionId();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (sid && !headers.has("X-Session-ID")) {
    headers.set("X-Session-ID", sid);
  }

  const resolvedUrl = url.startsWith("http") ? url : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;

  try {
    const resp = await fetch(resolvedUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (resp.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("pathfinder_token");
      localStorage.removeItem("pathfinder_user");
      window.dispatchEvent(new Event("pathfinder_logout"));
    }

    return resp;
  } finally {
    clearTimeout(id);
  }
};

export const api = {
  get: (url, options, timeoutMs = 8000) =>
    fetchWithTimeout(url, { ...options, method: "GET" }, timeoutMs),

  post: (url, body, options, timeoutMs = 12000) =>
    fetchWithTimeout(
      url,
      {
        ...options,
        method: "POST",
        headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
        body: body ? JSON.stringify(body) : undefined,
      },
      timeoutMs
    ),

  chat: (body, options, timeoutMs = 45000) =>
    fetchWithTimeout(
      "/api/chat",
      {
        ...options,
        method: "POST",
        headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
        body: body ? JSON.stringify(body) : undefined,
      },
      timeoutMs
    ),

  delete: (url, options, timeoutMs = 8000) =>
    fetchWithTimeout(url, { ...options, method: "DELETE" }, timeoutMs),

  // Auth operations
  login: async (username, email) => {
    const resp = await api.post("/api/auth/login", { username, email });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Authentication error");
    }
    const data = await resp.json();
    if (data.token) {
      localStorage.setItem("pathfinder_token", data.token);
      localStorage.setItem("pathfinder_user", JSON.stringify(data.user));
    }
    return data;
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout", {}, {}, 3000);
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("pathfinder_token");
      localStorage.removeItem("pathfinder_user");
      window.dispatchEvent(new Event("pathfinder_logout"));
    }
  },

  getMe: async () => {
    const resp = await api.get("/api/auth/me");
    if (!resp.ok) throw new Error("Unauthenticated");
    return resp.json();
  },

  // Health
  checkHealth: async () => {
    const resp = await api.get("/api/health", {}, 4000);
    return resp.json();
  },

  // Admin stats (requires admin role)
  getAdminStats: async () => {
    const resp = await api.get("/api/admin/system-stats", {}, 6000);
    if (!resp.ok) {
      throw new Error(`Admin stats failed with status ${resp.status}`);
    }
    return resp.json();
  },
};
