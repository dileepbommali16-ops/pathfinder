// bridge-content.js
// Runs inside Pathfinder 2.0 tab and relays real Chrome automation requests
// between the Pathfinder web page and the Manifest V3 service worker.

(() => {
  const BRIDGE_VERSION = "1.0.0";
  const WEB_SOURCE = "PATHFINDER_DAS_WEB";
  const EXT_SOURCE = "DAS_CHROME_BRIDGE";

  function announceReady() {
    try {
      document.documentElement.dataset.dasChromeBridge = BRIDGE_VERSION;
    } catch {}
    window.postMessage(
      {
        source: EXT_SOURCE,
        type: "BRIDGE_READY",
        version: BRIDGE_VERSION,
      },
      "*"
    );
  }

  announceReady();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", announceReady, { once: true });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== WEB_SOURCE) return;

    if (msg.type === "BRIDGE_PING") {
      announceReady();
      return;
    }

    const { requestId, action, payload } = msg;
    if (!requestId || !action) return;

    try {
      chrome.runtime.sendMessage(
        { action, payload: payload || {} },
        (response) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            window.postMessage(
              {
                source: EXT_SOURCE,
                requestId,
                ok: false,
                error: lastErr.message || "Chrome extension bridge error",
              },
              "*"
            );
            return;
          }
          window.postMessage(
            {
              source: EXT_SOURCE,
              requestId,
              ok: Boolean(response?.ok),
              result: response?.result ?? null,
              error: response?.error ?? null,
            },
            "*"
          );
        }
      );
    } catch (err) {
      window.postMessage(
        {
          source: EXT_SOURCE,
          requestId,
          ok: false,
          error: String(err?.message || err),
        },
        "*"
      );
    }
  });
})();
