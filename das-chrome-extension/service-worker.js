// service-worker.js — Manifest V3 Real Chrome Automation Worker for DAS AI
// Zero ephemeral state variables: tab pointers persist in chrome.storage.local.

const PROGRAMIZ_URLS = {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getState() {
  const data = await chrome.storage.local.get(["pathfinderTabId", "lastTargetTabId", "lastAction"]);
  return data || {};
}

async function saveState(patch) {
  await chrome.storage.local.set(patch);
}

async function waitForTabComplete(tabId, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.status === "complete") return tab;
    } catch {
      throw new Error("Target tab was closed before finishing load.");
    }
    await sleep(250);
  }
  return await chrome.tabs.get(tabId);
}

async function getOrOpenTab(url, matchPrefix, activate = true) {
  const tabs = await chrome.tabs.query({});
  const existing = matchPrefix
    ? tabs.find((t) => typeof t.url === "string" && t.url.startsWith(matchPrefix))
    : null;

  if (existing && existing.id) {
    if (activate) {
      await chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId) {
        await chrome.windows.update(existing.windowId, { focused: true }).catch(() => {});
      }
    }
    await saveState({ lastTargetTabId: existing.id });
    return await waitForTabComplete(existing.id);
  }

  const created = await chrome.tabs.create({ url, active: activate });
  if (!created?.id) throw new Error("Failed to open Chrome tab.");
  await saveState({ lastTargetTabId: created.id });
  return await waitForTabComplete(created.id);
}

async function resolveTargetTab(preferDomain) {
  const state = await getState();
  const tabs = await chrome.tabs.query({});

  if (preferDomain) {
    const domMatch = tabs.find(
      (t) => typeof t.url === "string" && t.url.toLowerCase().includes(preferDomain.toLowerCase())
    );
    if (domMatch?.id) return domMatch;
  }

  if (state.lastTargetTabId) {
    const found = tabs.find((t) => t.id === state.lastTargetTabId);
    if (found?.id) return found;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id && !(activeTab.url || "").includes("pathfinder-client-fzom.vercel.app")) {
    return activeTab;
  }

  const nonPathfinder = tabs.find(
    (t) =>
      t.id &&
      typeof t.url === "string" &&
      t.url.startsWith("http") &&
      !t.url.includes("pathfinder-client-fzom.vercel.app")
  );
  if (nonPathfinder) return nonPathfinder;
  return activeTab || null;
}

// ============================================================================
// 1. REAL PROGRAMIZ MULTI-LANGUAGE COMPILER AUTOMATION (CodeMirror 6 + Run + Output)
// ============================================================================

async function handleProgramiz(payload) {
  const action = String(payload.action || "write_and_run").toLowerCase().trim();
  const langKey = String(payload.language || "c").toLowerCase().trim();
  const targetUrl = PROGRAMIZ_URLS[langKey] || PROGRAMIZ_URLS.c;
  const sourceCode = String(payload.source_code || payload.code || "");

  if (action === "clear") {
    const tab = await resolveTargetTab("programiz.com");
    if (!tab?.id) return { ok: false, error: "No Programiz compiler tab is currently open." };
    await chrome.tabs.update(tab.id, { active: true });
    const [exec] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const editors = Array.from(document.querySelectorAll(".cm-editor"));
        const codeEditor = editors.find((el) => !el.closest("#terminal")) || editors[0];
        const cmContent = codeEditor?.querySelector(".cm-content");
        if (!cmContent) return { ok: false, error: "Code editor not found on Programiz." };
        const view = cmContent.cmView?.view || codeEditor.cmView?.view;
        if (view && view.state && typeof view.dispatch === "function") {
          view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "" } });
        } else {
          cmContent.focus();
          document.execCommand("selectAll");
          document.execCommand("delete");
        }
        const clearBtn = document.querySelector("button.desktop-clear-button");
        if (clearBtn instanceof HTMLElement) clearBtn.click();
        return { ok: true, cleared: true, url: location.href };
      },
    });
    await saveState({ lastAction: `Cleared Programiz ${langKey.toUpperCase()} editor` });
    return { ok: Boolean(exec?.result?.ok), result: exec?.result };
  }

  if (action === "read_output") {
    const tab = await resolveTargetTab("programiz.com");
    if (!tab?.id) return { ok: false, error: "No Programiz compiler tab is currently open." };
    const [exec] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const editors = Array.from(document.querySelectorAll(".cm-editor"));
        const codeEditor = editors.find((el) => !el.closest("#terminal")) || editors[0];
        const code = (codeEditor?.querySelector(".cm-content")?.innerText || "").trim();
        const term = document.querySelector("#terminal");
        const output = (term?.innerText || term?.textContent || "").trim();
        const hasError = /\b(error:|syntaxerror|traceback|exception|undefined reference|compilation terminated|segmentation fault|fatal error)\b/i.test(
          output
        );
        return { ok: true, url: location.href, code: code.slice(0, 4000), output: output.slice(0, 2000), hasError };
      },
    });
    return { ok: true, result: exec?.result };
  }

  // Open or reuse exact Programiz language compiler tab
  const tab = await getOrOpenTab(targetUrl, targetUrl, true);

  if (action === "open" || !sourceCode.trim()) {
    await saveState({ lastAction: `Opened Programiz ${langKey.toUpperCase()} Compiler` });
    return { ok: true, result: { status: "opened", url: targetUrl, language: langKey, tabId: tab.id } };
  }

  // Wait for Programiz CodeMirror 6 editor to finish mounting (up to 12s)
  let editorReady = false;
  for (let i = 0; i < 30; i++) {
    const [probe] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const editors = Array.from(document.querySelectorAll(".cm-editor"));
        const codeEditor = editors.find((el) => !el.closest("#terminal")) || editors[0];
        return Boolean(codeEditor?.querySelector(".cm-content"));
      },
    });
    if (probe?.result) {
      editorReady = true;
      break;
    }
    await sleep(350);
  }

  if (!editorReady) {
    return { ok: false, error: "Programiz code editor did not finish loading in time." };
  }

  // Clear previous terminal output, inject code cleanly into CodeMirror 6, wait 250ms, click real Run button
  const [injectRes] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [sourceCode],
    func: async (codeToWrite) => {
      const editors = Array.from(document.querySelectorAll(".cm-editor"));
      const codeEditor = editors.find((el) => !el.closest("#terminal")) || editors[0];
      const cmContent = codeEditor?.querySelector(".cm-content");
      if (!cmContent) return { ok: false, error: "Programiz editor element missing." };

      const clearBtn = document.querySelector("button.desktop-clear-button");
      if (clearBtn instanceof HTMLElement) clearBtn.click();

      const view = cmContent.cmView?.view || codeEditor.cmView?.view;
      if (view && view.state && typeof view.dispatch === "function") {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: codeToWrite } });
      } else {
        cmContent.focus();
        document.execCommand("selectAll");
        document.execCommand("delete");
        document.execCommand("insertText", false, codeToWrite);
      }

      // Let Programiz's internal CodeMirror -> React state settle before clicking Run
      await new Promise((r) => setTimeout(r, 300));

      const termEl = document.querySelector("#terminal");
      const beforeTerm = (termEl?.innerText || "").trim();

      const runBtns = Array.from(document.querySelectorAll("button.run"));
      const visibleRun =
        runBtns.find((b) => b instanceof HTMLElement && b.offsetParent !== null) ||
        document.querySelector("button.desktop-run-button.run") ||
        document.querySelector("button.mobile-run-button.run");

      if (!(visibleRun instanceof HTMLElement)) {
        return { ok: false, error: "Programiz Run button not found." };
      }
      visibleRun.click();

      // Poll #terminal up to 8s until real execution output appears and stabilizes
      let lastOut = beforeTerm;
      let stableTicks = 0;
      const startMs = Date.now();
      while (Date.now() - startMs < 8500) {
        await new Promise((r) => setTimeout(r, 400));
        const curOut = (document.querySelector("#terminal")?.innerText || "").trim();
        const isPlaceholder = !curOut || /^try clicking the run button\.?$/i.test(curOut);
        if (!isPlaceholder && curOut !== beforeTerm) {
          if (curOut === lastOut) {
            stableTicks += 1;
            if (stableTicks >= 2) break;
          } else {
            lastOut = curOut;
            stableTicks = 0;
          }
        }
      }

      const finalOutput = (document.querySelector("#terminal")?.innerText || "").trim();
      const hasError = /\b(error:|syntaxerror|traceback|exception|undefined reference|compilation terminated|segmentation fault|fatal error|expected ['";})])\b/i.test(
        finalOutput
      );
      return {
        ok: true,
        url: location.href,
        output: finalOutput.slice(0, 2000) || "(Executed with empty stdout)",
        hasError,
      };
    },
  });

  await saveState({ lastAction: `Ran ${langKey.toUpperCase()} on real Programiz` });
  return {
    ok: Boolean(injectRes?.result?.ok),
    result: {
      language: langKey,
      tabId: tab.id,
      ...(injectRes?.result || {}),
    },
    error: injectRes?.result?.error || null,
  };
}

// ============================================================================
// 2. REAL GOOGLE SEARCH, CLICK, TYPE, SCROLL, VIEW & TAB SWITCHING AUTOMATION
// ============================================================================

async function handleGoogleSearch(payload) {
  const query = String(payload.query || payload.search_query || "").trim();
  if (!query) return { ok: false, error: "Search query is required." };
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const tab = await getOrOpenTab(url, null, true);
  await sleep(500);

  const [exec] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const results = [];
      const headings = Array.from(document.querySelectorAll("a h3"));
      for (let i = 0; i < headings.length && results.length < 6; i++) {
        const h3 = headings[i];
        const link = h3.closest("a");
        if (!link || !link.href || link.href.includes("google.com/search")) continue;
        const container = link.closest("[data-snhf], .g, .MjjYud") || link.parentElement?.parentElement;
        const snippet = (container?.innerText || "")
          .replace(h3.innerText || "", "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 180);
        results.push({
          index: results.length + 1,
          title: (h3.innerText || "").trim(),
          url: link.href,
          snippet,
        });
      }
      return {
        title: document.title,
        url: location.href,
        results,
      };
    },
  });

  await saveState({ lastAction: `Google Search: ${query.slice(0, 40)}` });
  return { ok: true, result: { tabId: tab.id, query, ...(exec?.result || {}) } };
}

async function handleBrowserOpenUrl(payload) {
  let url = String(payload.url || "").trim();
  if (!url) return { ok: false, error: "URL is required." };
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const tab = await getOrOpenTab(url, null, true);
  await sleep(400);
  const readRes = await readTabPage(tab.id);
  await saveState({ lastAction: `Opened ${url.slice(0, 48)}` });
  return { ok: true, result: { tabId: tab.id, ...readRes } };
}

async function readTabPage(tabId) {
  try {
    const [exec] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
          .map((el) => (el.innerText || "").trim())
          .filter(Boolean)
          .slice(0, 12);
        const links = Array.from(document.querySelectorAll("a[href], button"))
          .filter((el) => el instanceof HTMLElement && el.offsetParent !== null)
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 65),
            tag: el.tagName.toLowerCase(),
          }))
          .filter((item) => item.text.length >= 2)
          .slice(0, 20);
        const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 2200);
        return { title: document.title, url: location.href, headings, clickables: links, text: bodyText };
      },
    });
    return exec?.result || {};
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}

async function handleBrowserClick(payload) {
  const tab = await resolveTargetTab(payload.domain);
  if (!tab?.id) return { ok: false, error: "No active target Chrome tab found." };
  await chrome.tabs.update(tab.id, { active: true });

  const targetText = String(payload.target || payload.label || "").trim();
  const resultIndex = Number(payload.index || 0);

  const [exec] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [targetText, resultIndex],
    func: (labelQuery, idx) => {
      // 1. If on Google Search and an index (1st, 2nd, 3rd result) was requested
      if (idx >= 1 && location.hostname.includes("google.")) {
        const links = Array.from(document.querySelectorAll("a h3"))
          .map((h) => h.closest("a"))
          .filter((a) => a && a.href && !a.href.includes("google.com/search"));
        const chosen = links[idx - 1];
        if (chosen instanceof HTMLElement) {
          chosen.scrollIntoView({ block: "center", behavior: "smooth" });
          chosen.click();
          return { ok: true, clicked: (chosen.innerText || chosen.href).slice(0, 100), href: chosen.href };
        }
      }

      const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
      const q = norm(labelQuery);
      const candidates = Array.from(
        document.querySelectorAll('a[href], button, [role="button"], [role="link"], [role="tab"], input[type="submit"]')
      ).filter((el) => el instanceof HTMLElement && el.offsetParent !== null);

      let best = null;
      let bestScore = 0;
      for (const el of candidates) {
        const text = norm(el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || el.value || "");
        if (!text) continue;
        let score = 0;
        if (text === q) score = 4;
        else if (text.startsWith(q)) score = 3;
        else if (q && text.includes(q)) score = 2;
        else if (q && text.length >= 3 && q.includes(text)) score = 1;
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      }

      if (!best && idx >= 1 && candidates[idx - 1]) {
        best = candidates[idx - 1];
      }

      if (!best) return { ok: false, error: `Could not find clickable element matching "${labelQuery || idx}".` };
      best.scrollIntoView({ block: "center", behavior: "smooth" });
      best.style.outline = "3px solid #22d3ee";
      setTimeout(() => {
        best.style.outline = "";
      }, 1200);
      best.click();
      return {
        ok: true,
        clicked: (best.innerText || best.getAttribute("aria-label") || best.tagName).trim().slice(0, 100),
      };
    },
  });

  await sleep(600);
  const afterInfo = await readTabPage(tab.id);
  await saveState({ lastAction: `Clicked ${targetText || `#${resultIndex}`}` });
  return {
    ok: Boolean(exec?.result?.ok),
    result: { ...(exec?.result || {}), pageAfterClick: { title: afterInfo.title, url: afterInfo.url } },
    error: exec?.result?.error || null,
  };
}

async function handleBrowserType(payload) {
  const tab = await resolveTargetTab(payload.domain);
  if (!tab?.id) return { ok: false, error: "No active target Chrome tab found." };
  await chrome.tabs.update(tab.id, { active: true });

  const text = String(payload.text || "");
  const target = String(payload.target || "").trim();
  const submit = Boolean(payload.submit);

  const [exec] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [text, target, submit],
    func: (val, targetLabel, shouldSubmit) => {
      const norm = (s) => (s || "").toLowerCase().trim();
      const q = norm(targetLabel);
      const inputs = Array.from(
        document.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"]')
      ).filter((el) => el instanceof HTMLElement && el.offsetParent !== null);

      let el = null;
      if (q) {
        el = inputs.find((i) =>
          norm(i.getAttribute("placeholder") || i.getAttribute("aria-label") || i.getAttribute("name") || "").includes(q)
        );
      }
      if (!el) el = inputs[0];
      if (!el) return { ok: false, error: "No visible input field found on this page." };

      el.focus();
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        document.execCommand("selectAll");
        document.execCommand("insertText", false, val);
      }

      if (shouldSubmit) {
        const form = el.closest("form");
        if (form) {
          form.requestSubmit ? form.requestSubmit() : form.submit();
        } else {
          el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
        }
      }
      return { ok: true, typed: val.slice(0, 80), submitted: shouldSubmit };
    },
  });

  await saveState({ lastAction: `Typed "${text.slice(0, 30)}"` });
  return { ok: Boolean(exec?.result?.ok), result: exec?.result, error: exec?.result?.error || null };
}

async function handleBrowserScroll(payload) {
  const tab = await resolveTargetTab(payload.domain);
  if (!tab?.id) return { ok: false, error: "No active target Chrome tab found." };
  await chrome.tabs.update(tab.id, { active: true });

  const direction = String(payload.direction || "down").toLowerCase().trim();
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [direction],
    func: (dir) => {
      if (dir === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else if (dir === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      else window.scrollBy({ top: (dir === "up" ? -1 : 1) * Math.round(window.innerHeight * 0.78), behavior: "smooth" });
    },
  });
  await saveState({ lastAction: `Scrolled ${direction}` });
  return { ok: true, result: { scrolled: direction, tabId: tab.id, url: tab.url } };
}

async function handleSwitchOrListTabs(action, payload, senderTabId) {
  const tabs = await chrome.tabs.query({});
  if (action === "list_tabs") {
    return {
      ok: true,
      result: {
        tabs: tabs.map((t, i) => ({ index: i + 1, id: t.id, title: t.title, url: t.url, active: t.active })),
      },
    };
  }

  if (action === "return_to_pathfinder") {
    const state = await getState();
    const pfTab =
      tabs.find((t) => t.id === (state.pathfinderTabId || senderTabId)) ||
      tabs.find((t) => typeof t.url === "string" && (t.url.includes("pathfinder-client-fzom.vercel.app") || t.url.includes("localhost")));
    if (pfTab?.id) {
      await chrome.tabs.update(pfTab.id, { active: true });
      if (pfTab.windowId) await chrome.windows.update(pfTab.windowId, { focused: true }).catch(() => {});
      await saveState({ lastAction: "Switched back to Pathfinder" });
      return { ok: true, result: { switchedTo: pfTab.title, url: pfTab.url } };
    }
    return { ok: false, error: "Pathfinder tab not found." };
  }

  const target = String(payload.target || payload.query || "").toLowerCase().trim();
  const match = tabs.find(
    (t) =>
      (t.title || "").toLowerCase().includes(target) ||
      (t.url || "").toLowerCase().includes(target)
  );
  if (match?.id) {
    await chrome.tabs.update(match.id, { active: true });
    if (match.windowId) await chrome.windows.update(match.windowId, { focused: true }).catch(() => {});
    await saveState({ lastTargetTabId: match.id, lastAction: `Switched tab: ${match.title?.slice(0, 35)}` });
    return { ok: true, result: { switchedTo: match.title, url: match.url, tabId: match.id } };
  }
  return { ok: false, error: `No open Chrome tab matching "${target}".` };
}

async function handleGmailVisualTab(payload) {
  const query = String(payload.query || "").trim();
  const view = String(payload.view || "inbox").toLowerCase().trim();
  let url = "https://mail.google.com/mail/u/0/#inbox";
  if (view === "sent") url = "https://mail.google.com/mail/u/0/#sent";
  else if (query) url = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;

  const tab = await getOrOpenTab(url, "https://mail.google.com/", true);
  if (tab.url !== url) {
    await chrome.tabs.update(tab.id, { url, active: true });
    await waitForTabComplete(tab.id);
  }
  await saveState({ lastAction: "Opened Gmail in Chrome" });
  return { ok: true, result: { status: "opened_gmail", url, tabId: tab.id } };
}

// ============================================================================
// MAIN MESSAGE DISPATCHER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (sender?.tab?.id) {
        await saveState({ pathfinderTabId: sender.tab.id });
      }
      const action = String(message?.action || "");
      const payload = message?.payload || {};

      if (action === "ping") {
        const tabs = await chrome.tabs.query({});
        sendResponse({ ok: true, result: { connected: true, version: "1.0.0", tabCount: tabs.length } });
        return;
      }

      if (action === "programiz_compiler") {
        sendResponse(await handleProgramiz(payload));
        return;
      }

      if (action === "google_search") {
        sendResponse(await handleGoogleSearch(payload));
        return;
      }

      if (action === "open_url") {
        sendResponse(await handleBrowserOpenUrl(payload));
        return;
      }

      if (action === "click") {
        sendResponse(await handleBrowserClick(payload));
        return;
      }

      if (action === "type") {
        sendResponse(await handleBrowserType(payload));
        return;
      }

      if (action === "scroll") {
        sendResponse(await handleBrowserScroll(payload));
        return;
      }

      if (action === "read_page") {
        const tab = await resolveTargetTab(payload.domain);
        if (!tab?.id) {
          sendResponse({ ok: false, error: "No active Chrome tab found to read." });
          return;
        }
        const info = await readTabPage(tab.id);
        sendResponse({ ok: true, result: { tabId: tab.id, ...info } });
        return;
      }

      if (action === "switch_tab" || action === "list_tabs" || action === "return_to_pathfinder") {
        sendResponse(await handleSwitchOrListTabs(action, payload, sender?.tab?.id));
        return;
      }

      if (action === "open_gmail_tab") {
        sendResponse(await handleGmailVisualTab(payload));
        return;
      }

      sendResponse({ ok: false, error: `Unknown Chrome bridge action: ${action}` });
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();
  return true; // keep async channel open
});
