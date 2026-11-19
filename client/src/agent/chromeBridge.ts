// client/src/agent/chromeBridge.ts
// Real Chrome Automation Bridge connecting Pathfinder 2.0 web app to the
// Manifest V3 `das-chrome-extension` for Programiz multi-language compiling,
// Google search/click/scroll/read, tab switching, and Gmail visuals.

import { toast } from "sonner";

const WEB_SOURCE = "PATHFINDER_DAS_WEB";
const EXT_SOURCE = "DAS_CHROME_BRIDGE";

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
        this.version = data.version || "1.0.0";
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
    timeoutMs = 16000
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
        error: "DAS Chrome Automation Bridge extension is not loaded in this browser yet.",
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

    // Extension not loaded yet -> open the real Programiz URL (NEVER open the fake internal sidebar!)
    if (action !== "clear" && action !== "read_output") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    toast.info(
      "Opened real Programiz tab & copied code! Load 'das-chrome-extension' in chrome://extensions for full hands-free typing & Run."
    );
    return {
      ok: false,
      bridgeMissing: true,
      openedUrl: url,
      language: langKey,
      copiedToClipboard: Boolean(code),
      message:
        "Real Programiz tab opened and code copied to clipboard. To type, run, clear, and auto-fix inside Programiz automatically, load the 'das-chrome-extension' folder in chrome://extensions.",
    };
  }

  public async runChromeBrowserControl(args: {
    action: string;
    query?: string;
    url?: string;
    target?: string;
    text?: string;
    submit?: boolean;
    direction?: string;
    index?: number;
  }): Promise<Record<string, any>> {
    const action = (args.action || "read_page").toLowerCase().trim();

    if (this.isConnected) {
      const resp = await this.sendAction(action, args, 15000);
      if (resp.ok) {
        return { ok: true, bridge: "chrome_extension", ...(resp.result || {}) };
      }
      return { ok: false, bridge: "chrome_extension", error: resp.error || "Chrome action failed." };
    }

    // Graceful browser fallbacks when extension isn't loaded yet
    if (action === "google_search" && args.query) {
      const u = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
      window.open(u, "_blank", "noopener,noreferrer");
      toast.success(`Opened Google Search for "${args.query}"`);
      return {
        ok: true,
        bridgeMissing: true,
        url: u,
        message: "Opened Google Search tab. Load 'das-chrome-extension' for clicking links, scrolling, and reading pages live.",
      };
    }
    if (action === "open_url" && args.url) {
      const u = /^https?:\/\//i.test(args.url) ? args.url : `https://${args.url}`;
      window.open(u, "_blank", "noopener,noreferrer");
      return { ok: true, bridgeMissing: true, url: u };
    }
    if (action === "return_to_pathfinder") {
      window.focus();
      return { ok: true, message: "Focused Pathfinder dashboard." };
    }
    toast.info("Load 'das-chrome-extension' in chrome://extensions for full Chrome click/scroll/read control.");
    return {
      ok: false,
      bridgeMissing: true,
      message:
        "DAS Chrome Bridge extension is not loaded in Chrome yet. Enable Developer Mode at chrome://extensions and Load Unpacked 'das-chrome-extension'.",
    };
  }

  public async openGmailVisualTab(args: { query?: string; view?: string } = {}): Promise<Record<string, any>> {
    if (this.isConnected) {
      const resp = await this.sendAction("open_gmail_tab", args, 10000);
      if (resp.ok) return { ok: true, bridge: "chrome_extension", ...(resp.result || {}) };
    }
    const url = args.query
      ? `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(args.query)}`
      : args.view === "sent"
        ? "https://mail.google.com/mail/u/0/#sent"
        : "https://mail.google.com/mail/u/0/#inbox";
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true, url, message: "Opened Gmail in Chrome." };
  }
}

export const chromeBridge = new DasChromeBridgeClient();
if (typeof window !== "undefined") {
  chromeBridge.init();
  (window as any).dasChromeBridge = chromeBridge;
}
