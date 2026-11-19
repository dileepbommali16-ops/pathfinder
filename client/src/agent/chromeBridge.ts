// client/src/agent/chromeBridge.ts
// Real Chrome Automation Bridge connecting Pathfinder 2.0 web app to:
// 1. Manifest V3 `das-chrome-extension` on Laptop Chrome (direct tab control, clicks, Gmail UI, WhatsApp Web, Programiz)
// 2. Cloud Search / Page Reader + Live Gmail & WhatsApp Workspace Drawer fallback on Phone / Tablet / unextended browsers

import { toast } from "sonner";
import { API_BASE } from "@/lib/apiClient";

const WEB_SOURCE = "PATHFINDER_DAS_WEB";
const EXT_SOURCE = "DAS_CHROME_BRIDGE";

export interface WebSearchResultItem {
  index: number;
  title: string;
  url: string;
  host?: string;
  snippet?: string;
  isOfficial?: boolean;
  is_official?: boolean;
}

export interface WebPageData {
  url: string;
  title: string;
  headings?: string[];
  links?: Array<{ text: string; href: string }>;
  text?: string;
}

export const PROGRAMIZ_LANGUAGE_URLS: Record<string, string> = {
  c: "https://www.programiz.com/c-programming/online-compiler/",
  cpp: "https://www.programiz.com/cpp-programming/online-compiler/",
  "c++": "https://www.programiz.com/cpp-programming/online-compiler/",
  python: "https://www.programiz.com/python-programming/online-compiler/",
  py: "https://www.programiz.com/python-programming/online-compiler/",
  java: "https://www.programiz.com/java-programming/online-compiler/",
  javascript: "https://www.programiz.com/javascript/online-compiler/",
  js: "https://www.programiz.com/javascript/online-compiler/",
  typescript: "https://www.programiz.com/javascript/online-compiler/",
  csharp: "https://www.programiz.com/csharp-programming/online-compiler/",
  "c#": "https://www.programiz.com/csharp-programming/online-compiler/",
  sql: "https://www.programiz.com/sql/online-compiler/",
  rust: "https://www.programiz.com/rust/online-compiler/",
  go: "https://www.programiz.com/golang/online-compiler/",
  golang: "https://www.programiz.com/golang/online-compiler/",
  php: "https://www.programiz.com/php/online-compiler/",
  html: "https://www.programiz.com/html/online-compiler/",
};

interface PendingReq {
  resolve: (value: any) => void;
  timer: number;
}

class DasChromeBridgeClient {
  private connected = false;
  private version: string | null = null;
  private initialized = false;
  private reqSeq = 0;
  private pending = new Map<string, PendingReq>();
  private listeners = new Set<(connected: boolean) => void>();
  public lastWebResults: WebSearchResultItem[] = [];
  public lastPageData: WebPageData | null = null;

  public emitAutomationUpdate(payload: Record<string, any>) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("das:automation-update", { detail: payload }));
  }

  public get isConnected(): boolean {
    this.init();
    if (!this.connected && typeof document !== "undefined" && document.documentElement?.dataset?.dasChromeBridge) {
      this.connected = true;
      this.version = document.documentElement.dataset.dasChromeBridge;
    }
    return this.connected;
  }

  public get bridgeVersion(): string | null {
    return this.version;
  }

  public init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    if (document.documentElement?.dataset?.dasChromeBridge) {
      this.connected = true;
      this.version = document.documentElement.dataset.dasChromeBridge;
    }

    window.addEventListener("message", (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== EXT_SOURCE) return;

      if (data.type === "BRIDGE_READY") {
        const changed = !this.connected;
        this.connected = true;
        this.version = data.version || "2.0.0";
        if (changed) this.notify();
        return;
      }

      const reqId = data.requestId;
      if (reqId && this.pending.has(reqId)) {
        const entry = this.pending.get(reqId)!;
        this.pending.delete(reqId);
        window.clearTimeout(entry.timer);
        entry.resolve({
          ok: Boolean(data.ok),
          result: data.result ?? null,
          error: data.error ?? null,
        });
      }
    });

    this.ping();
    window.setTimeout(() => this.ping(), 700);
  }

  public ping() {
    if (typeof window === "undefined") return;
    window.postMessage({ source: WEB_SOURCE, type: "BRIDGE_PING" }, "*");
  }

  public onStatusChange(cb: (connected: boolean) => void): () => void {
    this.init();
    this.listeners.add(cb);
    cb(this.isConnected);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb(this.connected);
      } catch {}
    });
  }

  public sendAction(
    action: string,
    payload: Record<string, any> = {},
    timeoutMs = 18000
  ): Promise<{ ok: boolean; result?: any; error?: string; bridgeMissing?: boolean }> {
    this.init();
    if (typeof window === "undefined") {
      return Promise.resolve({ ok: false, error: "Window unavailable", bridgeMissing: true });
    }
    if (!this.isConnected) {
      this.ping();
      return Promise.resolve({
        ok: false,
        bridgeMissing: true,
        error: "DAS Chrome Automation Bridge extension is not loaded in this browser.",
      });
    }

    const requestId = `das_req_${Date.now()}_${++this.reqSeq}`;
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(requestId);
        resolve({ ok: false, error: `Chrome extension action '${action}' timed out.` });
      }, timeoutMs);

      this.pending.set(requestId, { resolve, timer });
      window.postMessage(
        {
          source: WEB_SOURCE,
          requestId,
          action,
          payload,
        },
        "*"
      );
    });
  }

  public async runProgramizCompiler(args: {
    action?: string;
    language?: string;
    source_code?: string;
    code?: string;
    program_title?: string;
  }): Promise<Record<string, any>> {
    const action = (args.action || "write_and_run").toLowerCase().trim();
    const langKey = (args.language || "c").toLowerCase().trim();
    const url = PROGRAMIZ_LANGUAGE_URLS[langKey] || PROGRAMIZ_LANGUAGE_URLS.c;
    const code = String(args.source_code || args.code || "");

    if (code && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }

    if (this.isConnected) {
      const labelMap: Record<string, string> = {
        write_and_run: `Running ${langKey.toUpperCase()} code in real Programiz Chrome tab...`,
        clear: `Clearing code in Programiz Chrome tab...`,
        read_output: `Reading Programiz terminal output...`,
        open: `Opening Programiz ${langKey.toUpperCase()} compiler...`,
      };
      toast.info(labelMap[action] || "Automating Programiz in Chrome...");

      const resp = await this.sendAction("programiz_compiler", {
        action,
        language: langKey,
        source_code: code,
        program_title: args.program_title || "",
      });

      if (resp.ok && resp.result) {
        if (action === "clear") {
          toast.success("Cleared Programiz code & output!");
        } else if (resp.result.hasError) {
          toast.warning("Programiz reported a compiler error — DAS is analyzing & fixing it...");
        } else if (action === "write_and_run") {
          toast.success(`Programiz ${langKey.toUpperCase()} executed live!`);
        }
        return { ok: true, bridge: "chrome_extension", ...resp.result };
      }
      return {
        ok: false,
        bridge: "chrome_extension",
        error: resp.error || "Programiz automation returned an error.",
        ...(resp.result || {}),
      };
    }

    if (action !== "clear" && action !== "read_output") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    toast.info(
      "Opened real Programiz tab & copied code! Load 'das-chrome-extension' in chrome://extensions for hands-free Run."
    );
    return {
      ok: false,
      bridgeMissing: true,
      openedUrl: url,
      language: langKey,
      copiedToClipboard: Boolean(code),
      message:
        "Real Programiz tab opened and code copied to clipboard. Load 'das-chrome-extension' in chrome://extensions for automated Run.",
    };
  }

  private resolveClickUrlFromCache(args: { url?: string; target?: string; index?: number }): string | null {
    if (args.url && /^https?:\/\//i.test(args.url)) return args.url;
    if (!this.lastWebResults.length) return null;

    const lower = (args.target || "").toLowerCase().trim();
    let idx = Number(args.index || 0);
    if (!idx && lower) {
      if (/\b(1st|first|top)\b/.test(lower)) idx = 1;
      else if (/\b(2nd|second)\b/.test(lower)) idx = 2;
      else if (/\b(3rd|third)\b/.test(lower)) idx = 3;
      else if (/\b(4th|fourth)\b/.test(lower)) idx = 4;
      else if (/\b(5th|fifth)\b/.test(lower)) idx = 5;
    }

    if (/\b(official|main site|homepage|docs|documentation)\b/.test(lower)) {
      const strip = /\b(open|click|link|links|website|site|official|the|of|and|in|on|nokku|nokkandi)\b/g;
      const tokens = lower.replace(strip, " ").trim().split(/\s+/).filter((t) => t.length >= 2);
      let best: WebSearchResultItem | null = null;
      let bestScore = -1;
      for (const r of this.lastWebResults) {
        let s = r.isOfficial || r.is_official ? 5 : 0;
        const hay = `${r.title} ${r.host || ""} ${r.url} ${r.snippet || ""}`.toLowerCase();
        for (const tok of tokens) {
          if ((r.host || "").includes(tok)) s += 4;
          else if (hay.includes(tok)) s += 2;
        }
        if (s > bestScore) {
          bestScore = s;
          best = r;
        }
      }
      if (best?.url) return best.url;
    }

    if (idx >= 1 && this.lastWebResults[idx - 1]?.url) {
      return this.lastWebResults[idx - 1].url;
    }

    if (lower) {
      const tokens = lower.split(/\s+/).filter((t) => t.length >= 3);
      let best: WebSearchResultItem | null = null;
      let bestScore = 0;
      for (const r of this.lastWebResults) {
        const hay = `${r.title} ${r.host || ""} ${r.url} ${r.snippet || ""}`.toLowerCase();
        let s = 0;
        for (const tok of tokens) {
          if (hay.includes(tok)) s += 2;
        }
        if (s > bestScore) {
          bestScore = s;
          best = r;
        }
      }
      if (best?.url && bestScore >= 2) return best.url;
    }

    return this.lastWebResults[0]?.url || null;
  }

  public async runChromeBrowserControl(args: {
    action: string;
    query?: string;
    url?: string;
    target?: string;
    domain?: string;
    text?: string;
    submit?: boolean;
    direction?: string;
    index?: number;
  }): Promise<Record<string, any>> {
    const action = (args.action || "read_page").toLowerCase().trim();

    if (this.isConnected) {
      const resp = await this.sendAction(action, args, 18000);
      if (resp.ok && resp.result) {
        if (Array.isArray(resp.result.results)) {
          this.lastWebResults = resp.result.results;
        }
        if (resp.result.url && resp.result.text) {
          this.lastPageData = {
            url: resp.result.url,
            title: resp.result.title || resp.result.url,
            headings: resp.result.headings,
            links: resp.result.clickables,
            text: resp.result.text,
          };
        }
        this.emitAutomationUpdate({
          kind: "web",
          action,
          openDrawer: false,
          ...resp.result,
        });
        return { ok: true, bridge: "chrome_extension", ...resp.result };
      }
      return { ok: false, bridge: "chrome_extension", error: resp.error || "Chrome action failed." };
    }

    // Cloud Web Hub mode for Phone / Tablet / unextended browsers (Zero popup blocks!)
    if (action === "google_search" && args.query) {
      try {
        const r = await fetch(
          `${API_BASE}/api/google/web/search?q=${encodeURIComponent(args.query)}&max_results=8`
        );
        const data = r.ok ? await r.json() : { ok: false, results: [] };
        const results: WebSearchResultItem[] = Array.isArray(data.results) ? data.results : [];
        this.lastWebResults = results;
        this.emitAutomationUpdate({
          kind: "web",
          action: "google_search",
          openDrawer: true,
          query: args.query,
          results,
        });
        return {
          ok: true,
          mode: "cloud_web_drawer",
          query: args.query,
          results,
          message: `Found ${results.length} results for "${args.query}" inside DAS Web Hub.`,
        };
      } catch (err) {
        return { ok: false, mode: "cloud_web_drawer", error: String(err) };
      }
    }

    if (action === "click" || action === "open_url") {
      let targetUrl =
        action === "open_url" && args.url
          ? /^https?:\/\//i.test(args.url)
            ? args.url
            : `https://${args.url}`
          : this.resolveClickUrlFromCache(args);

      if (!targetUrl && args.target && /^https?:\/\//i.test(args.target)) {
        targetUrl = args.target;
      }

      if (!targetUrl && action === "click" && this.lastPageData?.links?.length) {
        const lower = (args.target || "").toLowerCase();
        const foundLink = this.lastPageData.links.find(
          (l) => l.text.toLowerCase().includes(lower) || l.href.toLowerCase().includes(lower)
        );
        if (foundLink?.href) targetUrl = foundLink.href;
      }

      if (!targetUrl) {
        return {
          ok: false,
          mode: "cloud_web_drawer",
          error: "No matching URL or previous search results found. Search Google first.",
        };
      }

      try {
        const r = await fetch(`${API_BASE}/api/google/web/read?url=${encodeURIComponent(targetUrl)}`);
        const pageData = r.ok
          ? await r.json()
          : { ok: false, url: targetUrl, title: targetUrl, headings: [], links: [], text: "" };
        this.lastPageData = pageData;
        this.emitAutomationUpdate({
          kind: "web",
          action: "read",
          openDrawer: true,
          ...pageData,
        });
        return {
          ok: true,
          mode: "cloud_web_drawer",
          clicked: pageData.title || targetUrl,
          ...pageData,
        };
      } catch (err) {
        return { ok: false, mode: "cloud_web_drawer", url: targetUrl, error: String(err) };
      }
    }

    if (action === "read_page") {
      if (this.lastPageData) {
        this.emitAutomationUpdate({ kind: "web", action: "read", openDrawer: true, ...this.lastPageData });
        return { ok: true, mode: "cloud_web_drawer", ...this.lastPageData };
      }
      const root = (document.querySelector("main") as HTMLElement | null) || document.body;
      return {
        ok: true,
        title: document.title,
        url: window.location.href,
        text: (root?.innerText || "").replace(/\s+/g, " ").slice(0, 2200),
      };
    }

    if (action === "return_to_pathfinder") {
      this.emitAutomationUpdate({ kind: "close_drawer" });
      window.focus();
      return { ok: true, message: "Returned to Pathfinder dashboard." };
    }

    this.emitAutomationUpdate({ kind: "web", openDrawer: true });
    return {
      ok: false,
      mode: "cloud_web_drawer",
      message: "Opened DAS Web Hub. For external tab scroll/typing on laptop, reload 'das-chrome-extension' in chrome://extensions.",
    };
  }

  public async runGmailVisualAction(args: {
    action?: string;
    query?: string;
    view?: string;
    thread_id?: string;
    message_id?: string;
    target?: string;
    index?: number;
    recipient_email?: string;
    subject?: string;
    body?: string;
    send_now?: boolean;
  } = {}): Promise<Record<string, any>> {
    if (this.isConnected) {
      const resp = await this.sendAction("gmail_action", args, 15000);
      if (resp.ok) {
        return { ok: true, bridge: "chrome_extension", ...(resp.result || {}) };
      }
    }

    // Direct REAL Gmail URL launch (ZERO fake copy/blueprint drawer!)
    const act = String(args.action || "open_gmail_tab").toLowerCase().trim();
    const view = String(args.view || "inbox").toLowerCase().trim();
    let realUrl = "https://mail.google.com/mail/u/0/#inbox";

    if (act === "compose_visual" || act === "send_email" || (args.recipient_email && (args.subject || args.body))) {
      const to = encodeURIComponent(String(args.recipient_email || ""));
      const su = encodeURIComponent(String(args.subject || ""));
      const body = encodeURIComponent(String(args.body || ""));
      realUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
    } else if (args.thread_id || args.message_id) {
      const tid = encodeURIComponent(String(args.thread_id || args.message_id || ""));
      realUrl = `https://mail.google.com/mail/u/0/#all/${tid}`;
    } else if (act === "search_gmail_visual" && args.query) {
      realUrl = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(String(args.query))}`;
    } else if (view === "sent" || view === "drafts" || view === "starred") {
      realUrl = `https://mail.google.com/mail/u/0/#${view}`;
    }

    if (typeof window !== "undefined" && typeof window.open === "function") {
      try {
        window.open(realUrl, "_blank", "noopener,noreferrer");
      } catch {}
    }

    return {
      ok: true,
      mode: "real_gmail_url",
      url: realUrl,
      message: "Opened your real Gmail (mail.google.com) directly.",
    };
  }

  public async runWhatsAppAction(args: {
    action?: string;
    contact?: string;
    phone?: string;
    message?: string;
  } = {}): Promise<Record<string, any>> {
    const cleanDigits = String(args.phone || "").replace(/[^\d]/g, "");
    const encodedMsg = encodeURIComponent(String(args.message || ""));
    const waUrl = cleanDigits
      ? `https://wa.me/${cleanDigits}?text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    if (this.isConnected) {
      const resp = await this.sendAction("whatsapp_action", { ...args, send_now: true }, 16000);
      if (resp.ok) {
        return { ok: true, bridge: "chrome_extension", waUrl, ...(resp.result || {}) };
      }
    }

    if (typeof window !== "undefined" && typeof window.open === "function") {
      try {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      } catch {}
    }

    return {
      ok: true,
      mode: "real_whatsapp_url",
      waUrl,
      message: "Opened real WhatsApp directly.",
    };
  }

  public async openGmailVisualTab(args: { query?: string; view?: string } = {}): Promise<Record<string, any>> {
    return this.runGmailVisualAction({ action: "open_gmail_tab", ...args });
  }
}

export const chromeBridge = new DasChromeBridgeClient();
if (typeof window !== "undefined") {
  chromeBridge.init();
  (window as any).dasChromeBridge = chromeBridge;
}
