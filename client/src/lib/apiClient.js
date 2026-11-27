/**
 * Pathfinder 2.0 Centralized API Client & Autonomous Edge Engine
 * - Unified base URL resolution
 * - Honest cold-start handling: waits for the sleeping Render backend and retries (never fakes answers)
 * - Automatic Authorization: Bearer <token> injection
 * - 401 interception: clean logout and redirect event
 */

export const PROD_BACKEND_URL = "https://pathfinder-backend-sg.onrender.com";

export const getApiBase = () => {
  if (typeof window !== "undefined") {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim()) return envUrl.replace(/\/+$/, "");
    const host = window.location.hostname;
    if (host.includes("onrender.com")) {
      return window.location.origin;
    }
  }
  return PROD_BACKEND_URL;
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

// Render free-tier instances sleep when idle. The guard never invents local answers
// (no fake predictions, fake health checks, fake logins or synthetic 404s). It waits
// for the real cloud backend to wake up and replays the same request with backoff.
const WAKE_RETRY_DELAYS_MS = [2000, 3000, 5000, 8000, 10000, 12000, 15000];

const emitBackendStatus = (status) => {
  if (typeof window === "undefined") return;
  try {
    window.__pathfinderBackendStatus = status;
    window.dispatchEvent(new CustomEvent("pathfinder-backend-status", { detail: { status } }));
  } catch {
    // ignore
  }
};

const isColdStartStatus = (status) => status === 502 || status === 503 || status === 504;

const abortError = () => {
  try {
    return new DOMException("Aborted", "AbortError");
  } catch {
    const err = new Error("Aborted");
    err.name = "AbortError";
    return err;
  }
};

const sleepUnlessAborted = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });

// Structured FastAPI JSON errors (e.g. 503 GitHub rate limit detail) are real answers.
const isStructuredBackendError = async (resp) => {
  const contentType = resp.headers?.get("content-type") || "";
  if (!contentType.includes("application/json")) return false;
  const data = await resp.clone().json().catch(() => null);
  return Boolean(data && typeof data.detail === "string");
};

const backendWakingResponse = () =>
  new Response(
    JSON.stringify({
      status: "waking",
      detail: "Pathfinder cloud backend is waking up. Please retry in a few seconds.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );

const isReplayableBody = (input, init) => {
  if (typeof Request !== "undefined" && input instanceof Request && input.body) return false;
  const body = init?.body;
  if (!body || typeof body === "string") return true;
  if (typeof FormData !== "undefined" && body instanceof FormData) return true;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return true;
  if (typeof Blob !== "undefined" && body instanceof Blob) return true;
  return false;
};

if (typeof window !== "undefined" && typeof window.fetch === "function" && !window.__pathfinderFetchGuarded) {
  window.__pathfinderFetchGuarded = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input?.url || "";
    const isTargetBackend =
      urlStr.includes(".onrender.com") ||
      urlStr.includes("/api/") ||
      (API_BASE && urlStr.startsWith(API_BASE));

    if (!isTargetBackend) {
      return nativeFetch(input, init);
    }

    const signal = init?.signal || (typeof Request !== "undefined" && input instanceof Request ? input.signal : undefined);
    const replayable = isReplayableBody(input, init);
    let lastResp = null;

    for (let attempt = 0; attempt <= WAKE_RETRY_DELAYS_MS.length; attempt++) {
      try {
        const resp = await nativeFetch(input, init);
        if (!isColdStartStatus(resp.status) || (await isStructuredBackendError(resp))) {
          if (attempt > 0) emitBackendStatus("online");
          return resp;
        }
        lastResp = resp;
      } catch (err) {
        if (err?.name === "AbortError" || signal?.aborted) throw err;
        lastResp = null;
      }
      if (!replayable || attempt === WAKE_RETRY_DELAYS_MS.length) break;
      emitBackendStatus("waking");
      await sleepUnlessAborted(WAKE_RETRY_DELAYS_MS[attempt], signal);
    }

    emitBackendStatus("offline");
    return lastResp || backendWakingResponse();
  };
}

// Cold-start wake-up retries are handled once, centrally, by the fetch guard above.
export const fetchWithTimeout = async (url, options = {}, timeoutMs = 55000) => {
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
    const resp = await window.fetch(resolvedUrl, {
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
  get: (url, options, timeoutMs = 50000) =>
    fetchWithTimeout(url, { ...options, method: "GET" }, timeoutMs),

  post: (url, body, options, timeoutMs = 50000) =>
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

  chat: (body, options, timeoutMs = 60000) =>
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

  delete: (url, options, timeoutMs = 50000) =>
    fetchWithTimeout(url, { ...options, method: "DELETE" }, timeoutMs),

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

  checkHealth: async () => {
    const resp = await api.get("/api/health", {}, 4000);
    return resp.json();
  },

  getAdminStats: async () => {
    const resp = await api.get("/api/admin/system-stats", {}, 6000);
    if (!resp.ok) {
      throw new Error(`Admin stats failed with status ${resp.status}`);
    }
    return resp.json();
  },
};
