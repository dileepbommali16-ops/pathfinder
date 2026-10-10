/**
 * Pathfinder 2.0 Vanilla API Client (Zero-Framework, Pure JavaScript)
 * - Supports direct browser execution (no Vite / Node required)
 * - Automatic Authorization: Bearer <token> injection
 * - Auto-detects local vs deployed backend
 * - Provides all 16 Pathfinder endpoints
 */

const getApiBase = () => {
  if (typeof window !== "undefined") {
    // If a custom override is in query params or localStorage
    const override = localStorage.getItem("pathfinder_api_base");
    if (override) return override.replace(/\/+$/, "");

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

const API_BASE = getApiBase();

const getSessionId = () => {
  if (typeof window === "undefined") return "session_default";
  let sid = localStorage.getItem("pathfinder_session_id");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem("pathfinder_session_id", sid);
  }
  return sid;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 50000, isRetry = false) => {
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

    if (!isRetry && (resp.status === 502 || resp.status === 503 || resp.status === 504)) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchWithTimeout(url, options, timeoutMs, true);
    }

    return resp;
  } catch (err) {
    if (!isRetry && !options.signal?.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchWithTimeout(url, options, timeoutMs, true);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
};

const api = {
  get: (url, options, timeoutMs) => fetchWithTimeout(url, { ...options, method: "GET" }, timeoutMs),
  post: (url, body, options, timeoutMs) =>
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
  delete: (url, options, timeoutMs) => fetchWithTimeout(url, { ...options, method: "DELETE" }, timeoutMs),
};

window.API_BASE = API_BASE;
window.fetchWithTimeout = fetchWithTimeout;
window.api = api;
