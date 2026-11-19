// service-worker.js — Manifest V3 Real Chrome Automation Worker for DAS AI (v2.0.0)
// Zero ephemeral state variables: tab pointers & search results persist in chrome.storage.local.

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
  const data = await chrome.storage.local.get([
    "pathfinderTabId",
    "lastTargetTabId",
    "lastSearchResults",
    "lastAction",
  ]);
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
  if (activate && created.windowId) {
    await chrome.windows.update(created.windowId, { focused: true }).catch(() => {});
  }
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
  if (
    activeTab?.id &&
    !(activeTab.url || "").includes("pathfinder-client-fzom.vercel.app")
  ) {
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

  // Clear previous terminal output, inject code cleanly into CodeMirror 6, wait 300ms, click real Run button
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
// 2. REAL GOOGLE SEARCH, SMART LINK CLICK, TYPE, SCROLL, READ & TAB SWITCHING
// ============================================================================

async function handleGoogleSearch(payload) {
  const query = String(payload.query || payload.search_query || "").trim();
  if (!query) return { ok: false, error: "Search query is required." };
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  // Reuse an existing Google Search tab if open, otherwise create one
  const tabs = await chrome.tabs.query({});
  const existingGoogle = tabs.find(
    (t) => typeof t.url === "string" && t.url.includes("google.com/search")
  );
  let tab;
  if (existingGoogle?.id) {
    await chrome.tabs.update(existingGoogle.id, { url, active: true });
    if (existingGoogle.windowId) {
      await chrome.windows.update(existingGoogle.windowId, { focused: true }).catch(() => {});
    }
    await saveState({ lastTargetTabId: existingGoogle.id });
    tab = await waitForTabComplete(existingGoogle.id);
  } else {
    tab = await getOrOpenTab(url, null, true);
  }

  // Poll up to 4s until organic search links mount on Google SRP
  let extracted = null;
  for (let attempt = 0; attempt < 16; attempt++) {
    try {
      const [exec] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [query],
        func: (searchQ) => {
          const unwrapHref = (rawHref) => {
            try {
              const u = new URL(rawHref, location.origin);
              if (u.hostname.includes("google.") && u.pathname === "/url") {
                return u.searchParams.get("q") || u.searchParams.get("url") || rawHref;
              }
              return u.href;
            } catch {
              return rawHref;
            }
          };

          const queryTokens = (searchQ || "")
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((t) => t.length >= 3);

          const rawAnchors = Array.from(
            document.querySelectorAll("div.yuRUbf a[href], #search a[href] h3, #rso a[href] h3, a[href] h3")
          );
          const seenUrls = new Set();
          const results = [];

          for (const node of rawAnchors) {
            const h3 = node.tagName === "H3" ? node : node.querySelector("h3");
            const link = node.tagName === "A" ? node : node.closest("a");
            if (!link || !link.href) continue;

            const cleanHref = unwrapHref(link.href);
            if (!cleanHref || !cleanHref.startsWith("http")) continue;
            if (
              cleanHref.includes("google.com/search") ||
              cleanHref.includes("accounts.google.com") ||
              cleanHref.includes("webcache.googleusercontent.com") ||
              cleanHref.includes("support.google.com/websearch")
            ) {
              continue;
            }
            if (seenUrls.has(cleanHref)) continue;
            seenUrls.add(cleanHref);

            let host = "";
            try {
              host = new URL(cleanHref).hostname.replace(/^www\./, "").toLowerCase();
            } catch {}

            const title = (h3?.innerText || link.innerText || host || cleanHref).trim();
            const container =
              link.closest("[data-snhf], .g, .MjjYud, .tF2Cxc") || link.parentElement?.parentElement;
            const snippet = (container?.innerText || "")
              .replace(title, "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 200);

            const hostParts = host.split(".");
            const hostBase = hostParts.join(" ");
            const isOfficial =
              queryTokens.some((tok) => hostBase.includes(tok)) ||
              (queryTokens.includes("claude") && (host.includes("anthropic.com") || host.includes("claude.ai"))) ||
              /\bofficial\b/i.test(title);

            results.push({
              index: results.length + 1,
              title: title.slice(0, 140),
              url: cleanHref,
              host,
              isOfficial,
              snippet,
            });
            if (results.length >= 10) break;
          }

          return {
            title: document.title,
            url: location.href,
            results,
          };
        },
      });
      if (exec?.result && Array.isArray(exec.result.results) && exec.result.results.length > 0) {
        extracted = exec.result;
        break;
      }
      extracted = exec?.result || extracted;
    } catch {}
    await sleep(250);
  }

  const finalResults = extracted?.results || [];
  await saveState({
    lastTargetTabId: tab.id,
    lastSearchResults: finalResults,
    lastAction: `Google Search: ${query.slice(0, 40)}`,
  });
  return {
    ok: true,
    result: {
      tabId: tab.id,
      query,
      title: extracted?.title || `Google Search: ${query}`,
      url: extracted?.url || url,
      results: finalResults,
    },
  };
}

async function handleBrowserOpenUrl(payload) {
  let url = String(payload.url || "").trim();
  if (!url) return { ok: false, error: "URL is required." };
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const tab = await getOrOpenTab(url, null, true);
  await sleep(450);
  const readRes = await readTabPage(tab.id);
  await saveState({ lastTargetTabId: tab.id, lastAction: `Opened ${url.slice(0, 48)}` });
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
          .slice(0, 15);
        const links = Array.from(document.querySelectorAll("a[href], button"))
          .filter((el) => el instanceof HTMLElement && el.offsetParent !== null)
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 65),
            tag: el.tagName.toLowerCase(),
            href: el instanceof HTMLAnchorElement ? el.href : undefined,
          }))
          .filter((item) => item.text.length >= 2)
          .slice(0, 25);
        const bodyText = (document.body?.innerText || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3200);
        return { title: document.title, url: location.href, headings, clickables: links, text: bodyText };
      },
    });
    return exec?.result || {};
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}

function parseClickIntent(targetText, explicitIdx, cachedResults) {
  const lower = String(targetText || "").toLowerCase().trim();
  let idx = Number(explicitIdx || 0);

  if (!idx && lower) {
    if (/\b(1st|first|top)\b/.test(lower)) idx = 1;
    else if (/\b(2nd|second)\b/.test(lower)) idx = 2;
    else if (/\b(3rd|third)\b/.test(lower)) idx = 3;
    else if (/\b(4th|fourth)\b/.test(lower)) idx = 4;
    else if (/\b(5th|fifth)\b/.test(lower)) idx = 5;
  }

  const wantsOfficial = /\b(official|main site|homepage|home page|docs|documentation)\b/.test(lower);
  let cachedDestUrl = null;
  if (Array.isArray(cachedResults) && cachedResults.length > 0) {
    if (wantsOfficial) {
      const stripWords = /\b(open|click|link|links|website|site|official|the|of|and|in|on|nokku|nokkandi)\b/g;
      const tokens = lower.replace(stripWords, " ").trim().split(/\s+/).filter((t) => t.length >= 2);
      let bestItem = null;
      let bestScore = -1;
      for (const item of cachedResults) {
        let s = item.isOfficial ? 5 : 0;
        const hay = `${item.title} ${item.host} ${item.url} ${item.snippet}`.toLowerCase();
        for (const tok of tokens) {
          if (item.host?.includes(tok)) s += 4;
          else if (hay.includes(tok)) s += 2;
        }
        if (s > bestScore) {
          bestScore = s;
          bestItem = item;
        }
      }
      if (bestItem?.url) cachedDestUrl = bestItem.url;
    } else if (idx >= 1 && cachedResults[idx - 1]?.url) {
      cachedDestUrl = cachedResults[idx - 1].url;
    } else if (lower) {
      const tokens = lower.split(/\s+/).filter((t) => t.length >= 3);
      let bestItem = null;
      let bestScore = 0;
      for (const item of cachedResults) {
        const hay = `${item.title} ${item.host} ${item.url}`.toLowerCase();
        let s = 0;
        for (const tok of tokens) {
          if (hay.includes(tok)) s += 2;
        }
        if (s > bestScore) {
          bestScore = s;
          bestItem = item;
        }
      }
      if (bestScore >= 2 && bestItem?.url) cachedDestUrl = bestItem.url;
    }
  }
  return { idx, wantsOfficial, cachedDestUrl };
}

async function handleBrowserClick(payload) {
  const explicitUrl = String(payload.url || "").trim();
  const targetText = String(payload.target || payload.label || "").trim();
  const explicitIdx = Number(payload.index || 0);
  const state = await getState();
  const cachedResults = Array.isArray(state.lastSearchResults) ? state.lastSearchResults : [];

  // 0. If direct URL was specified, navigate the active target tab cleanly to it and read it
  if (explicitUrl && /^https?:\/\//i.test(explicitUrl)) {
    const tab = await getOrOpenTab(explicitUrl, null, true);
    await sleep(500);
    const info = await readTabPage(tab.id);
    await saveState({ lastTargetTabId: tab.id, lastAction: `Opened ${explicitUrl.slice(0, 48)}` });
    return {
      ok: true,
      result: {
        tabId: tab.id,
        clicked: info.title || explicitUrl,
        href: explicitUrl,
        pageAfterClick: { title: info.title, url: info.url },
        ...info,
      },
    };
  }

  let tab = await resolveTargetTab(payload.domain);
  if (!tab?.id) return { ok: false, error: "No active target Chrome tab found." };
  await chrome.tabs.update(tab.id, { active: true });
  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
  }

  const tabsBefore = await chrome.tabs.query({});
  const tabIdsBefore = new Set(tabsBefore.map((t) => t.id));
  const urlBefore = tab.url || "";
  const { idx, wantsOfficial, cachedDestUrl } = parseClickIntent(
    targetText,
    explicitIdx,
    cachedResults
  );

  const [exec] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [targetText, idx, wantsOfficial],
    func: (labelQuery, parsedIdx, preferOfficial) => {
      const unwrapHref = (rawHref) => {
        try {
          const u = new URL(rawHref, location.origin);
          if (u.hostname.includes("google.") && u.pathname === "/url") {
            return u.searchParams.get("q") || u.searchParams.get("url") || rawHref;
          }
          return u.href;
        } catch {
          return rawHref;
        }
      };

      const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
      const q = norm(labelQuery);
      const qTokens = q
        .replace(/\b(open|click|link|links|website|site|official|first|second|third|1st|2nd|3rd|top|the|of|and|in|on|nokku|nokkandi)\b/g, " ")
        .trim()
        .split(/\s+/)
        .filter((t) => t.length >= 2);

      // 1. Google Search Results Page smart link matcher
      if (location.hostname.includes("google.")) {
        const anchors = [];
        const seen = new Set();
        const nodes = Array.from(
          document.querySelectorAll("div.yuRUbf a[href], #search a[href] h3, #rso a[href] h3, a[href] h3")
        );
        for (const n of nodes) {
          const a = n.tagName === "A" ? n : n.closest("a");
          const h3 = n.tagName === "H3" ? n : n.querySelector("h3");
          if (!a || !a.href) continue;
          const dest = unwrapHref(a.href);
          if (!dest || !dest.startsWith("http")) continue;
          if (
            dest.includes("google.com/search") ||
            dest.includes("accounts.google.com") ||
            dest.includes("webcache.googleusercontent.com")
          ) {
            continue;
          }
          if (seen.has(dest)) continue;
          seen.add(dest);
          let host = "";
          try {
            host = new URL(dest).hostname.replace(/^www\./, "").toLowerCase();
          } catch {}
          anchors.push({
            el: a,
            dest,
            host,
            title: (h3?.innerText || a.innerText || host).trim(),
          });
        }

        if (anchors.length > 0) {
          let chosen = null;
          if (parsedIdx >= 1 && anchors[parsedIdx - 1]) {
            chosen = anchors[parsedIdx - 1];
          } else {
            let bestScore = -1;
            for (let i = 0; i < anchors.length; i++) {
              const item = anchors[i];
              let score = preferOfficial && i === 0 ? 2 : 0;
              const hay = `${item.title} ${item.host} ${item.dest}`.toLowerCase();
              for (const tok of qTokens) {
                if (item.host.includes(tok)) score += 5;
                if (item.title.toLowerCase().includes(tok)) score += 3;
                else if (hay.includes(tok)) score += 1;
              }
              if (preferOfficial && qTokens.some((tok) => item.host.includes(tok))) {
                score += 6;
              }
              if (score > bestScore) {
                bestScore = score;
                chosen = item;
              }
            }
            if (!chosen || bestScore <= 0) {
              chosen = anchors[0];
            }
          }

          if (chosen?.el instanceof HTMLElement) {
            chosen.el.scrollIntoView({ block: "center", behavior: "smooth" });
            chosen.el.style.outline = "3px solid #FD0053";
            setTimeout(() => {
              chosen.el.style.outline = "";
            }, 1400);
            chosen.el.click();
            return {
              ok: true,
              clicked: chosen.title.slice(0, 120),
              href: chosen.dest,
            };
          }
        }
      }

      // 2. General Web Page Fuzzy Clickable Matcher
      const candidates = Array.from(
        document.querySelectorAll(
          'a[href], button, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="row"], tr.zA, input[type="submit"], summary'
        )
      ).filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
      });

      let best = null;
      let bestScore = 0;
      for (const el of candidates) {
        const href = el instanceof HTMLAnchorElement ? el.href : "";
        const text = norm(
          [
            el.innerText,
            el.getAttribute("aria-label"),
            el.getAttribute("title"),
            el.getAttribute("alt"),
            el.getAttribute("placeholder"),
            el.getAttribute("value"),
            href,
          ]
            .filter(Boolean)
            .join(" ")
        );
        if (!text) continue;
        let score = 0;
        if (text === q) score = 20;
        else if (q && text.startsWith(q)) score = 14;
        else if (q && text.includes(q)) score = 10;
        else if (qTokens.length > 0) {
          for (const tok of qTokens) {
            if (text.includes(tok)) score += 3;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      }

      if (!best && parsedIdx >= 1 && candidates[parsedIdx - 1]) {
        best = candidates[parsedIdx - 1];
      }

      if (!best) {
        return {
          ok: false,
          error: `Could not find clickable element matching "${labelQuery || parsedIdx}".`,
        };
      }

      best.scrollIntoView({ block: "center", behavior: "smooth" });
      best.style.outline = "3px solid #FD0053";
      setTimeout(() => {
        best.style.outline = "";
      }, 1400);

      const opts = { bubbles: true, cancelable: true, view: window };
      best.dispatchEvent(new PointerEvent("pointerdown", opts));
      best.dispatchEvent(new MouseEvent("mousedown", opts));
      best.focus?.();
      best.dispatchEvent(new PointerEvent("pointerup", opts));
      best.dispatchEvent(new MouseEvent("mouseup", opts));
      best.click();

      const destHref =
        best instanceof HTMLAnchorElement && best.href && best.href.startsWith("http")
          ? unwrapHref(best.href)
          : null;

      return {
        ok: true,
        clicked: (best.innerText || best.getAttribute("aria-label") || best.tagName).trim().slice(0, 120),
        href: destHref,
      };
    },
  });

  // Fallback destination if page click found nothing on Google tab but cached results exist
  let targetDestUrl = exec?.result?.href || cachedDestUrl;

  if (!exec?.result?.ok) {
    if (cachedDestUrl && /^https?:\/\//i.test(cachedDestUrl)) {
      await chrome.tabs.update(tab.id, { url: cachedDestUrl, active: true });
      await waitForTabComplete(tab.id);
      const afterInfo = await readTabPage(tab.id);
      await saveState({ lastTargetTabId: tab.id, lastAction: `Opened ${cachedDestUrl.slice(0, 48)}` });
      return {
        ok: true,
        result: {
          tabId: tab.id,
          clicked: afterInfo.title || cachedDestUrl,
          href: cachedDestUrl,
          pageAfterClick: { title: afterInfo.title, url: afterInfo.url },
          ...afterInfo,
        },
      };
    }
    return {
      ok: false,
      result: exec?.result || {},
      error: exec?.result?.error || `Could not click "${targetText}".`,
    };
  }

  // Wait briefly for navigation or spawned _blank tab; force navigate via tabs.update if anchor click was swallowed
  await sleep(650);
  const tabsAfter = await chrome.tabs.query({});
  const spawnedTab = tabsAfter.find(
    (t) => t.id && !tabIdsBefore.has(t.id) && typeof t.url === "string" && t.url.startsWith("http")
  );
  if (spawnedTab?.id) {
    tab = await waitForTabComplete(spawnedTab.id);
    await chrome.tabs.update(tab.id, { active: true });
  } else {
    const refreshed = await chrome.tabs.get(tab.id);
    if (
      refreshed.url === urlBefore &&
      targetDestUrl &&
      /^https?:\/\//i.test(targetDestUrl) &&
      targetDestUrl !== urlBefore
    ) {
      await chrome.tabs.update(tab.id, { url: targetDestUrl, active: true });
      tab = await waitForTabComplete(tab.id);
    } else {
      tab = await waitForTabComplete(tab.id);
    }
  }

  const afterInfo = await readTabPage(tab.id);
  await saveState({
    lastTargetTabId: tab.id,
    lastAction: `Clicked ${exec.result.clicked || targetText || `#${idx}`}`,
  });
  return {
    ok: true,
    result: {
      tabId: tab.id,
      clicked: exec.result.clicked,
      href: afterInfo.url || exec.result.href,
      pageAfterClick: { title: afterInfo.title, url: afterInfo.url },
      ...afterInfo,
    },
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
          norm(
            i.getAttribute("placeholder") ||
              i.getAttribute("aria-label") ||
              i.getAttribute("name") ||
              ""
          ).includes(q)
        );
      }
      if (!el) el = inputs[0];
      if (!el) return { ok: false, error: "No visible input field found on this page." };

      el.focus();
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const proto =
          el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
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
          el.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true })
          );
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
      else
        window.scrollBy({
          top: (dir === "up" ? -1 : 1) * Math.round(window.innerHeight * 0.78),
          behavior: "smooth",
        });
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
        tabs: tabs.map((t, i) => ({
          index: i + 1,
          id: t.id,
          title: t.title,
          url: t.url,
          active: t.active,
        })),
      },
    };
  }

  if (action === "return_to_pathfinder") {
    const state = await getState();
    const pfTab =
      tabs.find((t) => t.id === (state.pathfinderTabId || senderTabId)) ||
      tabs.find(
        (t) =>
          typeof t.url === "string" &&
          (t.url.includes("pathfinder-client-fzom.vercel.app") || t.url.includes("localhost"))
      );
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

// ============================================================================
// 3. FULL REAL GMAIL VISUAL & INTERACTIVE CHROME AUTOMATION
// ============================================================================

async function scrapeGmailRows(tabId) {
  for (let i = 0; i < 16; i++) {
    try {
      const [exec] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const rows = Array.from(document.querySelectorAll("tr.zA")).slice(0, 10);
          return rows.map((row, idx) => {
            const senderEl = row.querySelector(".yX.xY span[email], .zF, .yP");
            const subjEl = row.querySelector(".bog, .y6 span");
            const snipEl = row.querySelector(".y2");
            return {
              index: idx + 1,
              sender: (senderEl?.getAttribute("name") || senderEl?.textContent || "").trim(),
              subject: (subjEl?.textContent || "").trim(),
              snippet: (snipEl?.textContent || "").replace(/^[\s\u00a0\-–]+/, "").trim().slice(0, 120),
            };
          });
        },
      });
      if (Array.isArray(exec?.result) && exec.result.length > 0) {
        return exec.result;
      }
    } catch {}
    await sleep(300);
  }
  return [];
}

async function handleGmailAction(payload) {
  const act = String(payload.action || "open_gmail_tab").toLowerCase().trim();
  const query = String(payload.query || "").trim();
  const view = String(payload.view || "inbox").toLowerCase().trim();
  const threadId = String(payload.thread_id || payload.message_id || "").trim();
  const target = String(payload.target || "").trim();
  const rowIndex = Number(payload.index || 0);
  const to = String(payload.recipient_email || payload.to || "").trim();
  const subject = String(payload.subject || "").trim();
  const body = String(payload.body || payload.details || "").trim();
  const sendNow = Boolean(payload.send_now);

  // Compose & optionally click Send directly in real Gmail UI
  if (act === "compose" || act === "compose_visual" || act === "compose_and_send") {
    const cmUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const tab = await getOrOpenTab(cmUrl, null, true);
    await saveState({ lastTargetTabId: tab.id, lastAction: `Gmail Compose to ${to || "new recipient"}` });

    if (sendNow) {
      let sent = false;
      for (let i = 0; i < 16; i++) {
        await sleep(350);
        const [res] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const btn =
              document.querySelector('[role="button"][data-tooltip*="Send"]') ||
              document.querySelector('[role="button"][aria-label^="Send"]');
            if (btn instanceof HTMLElement) {
              btn.click();
              return true;
            }
            return false;
          },
        });
        if (res?.result) {
          sent = true;
          break;
        }
      }
      return { ok: true, result: { status: sent ? "sent_in_gmail_ui" : "compose_ready", to, subject, tabId: tab.id } };
    }
    return { ok: true, result: { status: "compose_opened", to, subject, tabId: tab.id, url: cmUrl } };
  }

  // Open specific Gmail folder / search / thread visually
  let targetUrl = "https://mail.google.com/mail/u/0/#inbox";
  if (act === "open_email_visual" || act === "open_email") {
    if (threadId) {
      targetUrl = `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(threadId)}`;
    }
  } else if (view === "sent" || act === "open_sent") {
    targetUrl = "https://mail.google.com/mail/u/0/#sent";
  } else if (view === "drafts" || act === "open_drafts") {
    targetUrl = "https://mail.google.com/mail/u/0/#drafts";
  } else if (view === "starred" || act === "open_starred") {
    targetUrl = "https://mail.google.com/mail/u/0/#starred";
  } else if (query || act === "search_gmail_visual" || act === "search_gmail") {
    targetUrl = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query || target)}`;
  }

  const tab = await getOrOpenTab(targetUrl, "https://mail.google.com/", true);
  if ((threadId || query || view !== "inbox") && tab.url !== targetUrl) {
    await chrome.tabs.update(tab.id, { url: targetUrl, active: true });
    await waitForTabComplete(tab.id);
    await sleep(800);
  }

  // Click email row by index or sender/subject match
  if ((act === "open_email_visual" || act === "open_email") && !threadId && (target || rowIndex >= 1)) {
    await sleep(500);
    const [clickEmail] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [target, rowIndex],
      func: (tQuery, rIdx) => {
        const rows = Array.from(document.querySelectorAll("tr.zA"));
        if (!rows.length) return { ok: false, error: "No emails visible in this Gmail view." };
        let chosen = null;
        if (rIdx >= 1 && rows[rIdx - 1]) {
          chosen = rows[rIdx - 1];
        } else if (tQuery) {
          const tokens = tQuery.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
          let bestScore = 0;
          for (const r of rows) {
            const hay = (r.textContent || "").toLowerCase();
            let s = 0;
            for (const tok of tokens) {
              if (hay.includes(tok)) s += 2;
            }
            if (s > bestScore) {
              bestScore = s;
              chosen = r;
            }
          }
        }
        if (!chosen) chosen = rows[0];
        if (chosen instanceof HTMLElement) {
          chosen.scrollIntoView({ block: "center" });
          chosen.style.outline = "3px solid #FD0053";
          setTimeout(() => {
            chosen.style.outline = "";
          }, 1200);
          chosen.click();
          return { ok: true, clicked: (chosen.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120) };
        }
        return { ok: false, error: "Could not click Gmail row." };
      },
    });
    await sleep(900);
    const [bodyExec] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const main = document.querySelector('[role="main"]');
        const heading = main?.querySelector("h2")?.textContent || document.title;
        const bodyText = (main?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 2600);
        return { title: heading, url: location.href, body: bodyText };
      },
    });
    await saveState({ lastTargetTabId: tab.id, lastAction: `Opened email in Gmail` });
    return {
      ok: Boolean(clickEmail?.result?.ok),
      result: { tabId: tab.id, ...(clickEmail?.result || {}), ...(bodyExec?.result || {}) },
    };
  }

  // Reply inside currently open Gmail thread
  if (act === "reply" || act === "reply_email") {
    const [repExec] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [body, sendNow],
      func: async (replyBody, shouldSend) => {
        const replyBtn =
          document.querySelector('[aria-label*="Reply"]') ||
          document.querySelector('[data-tooltip*="Reply"]');
        if (replyBtn instanceof HTMLElement) {
          replyBtn.click();
          await new Promise((r) => setTimeout(r, 600));
        }
        const box = document.querySelector('[role="textbox"][contenteditable="true"]');
        if (!(box instanceof HTMLElement)) {
          return { ok: false, error: "Gmail reply box not found. Open an email thread first." };
        }
        box.focus();
        document.execCommand("insertText", false, replyBody);
        if (shouldSend) {
          await new Promise((r) => setTimeout(r, 400));
          const sendBtn =
            document.querySelector('[role="button"][data-tooltip*="Send"]') ||
            document.querySelector('[role="button"][aria-label^="Send"]');
          if (sendBtn instanceof HTMLElement) sendBtn.click();
        }
        return { ok: true, replied: true, sent: shouldSend };
      },
    });
    await saveState({ lastTargetTabId: tab.id, lastAction: "Replied in Gmail" });
    return { ok: Boolean(repExec?.result?.ok), result: repExec?.result || {} };
  }

  // Generic button/folder click inside Gmail
  if (act === "click_gmail" && (target || rowIndex >= 1)) {
    const [clkExec] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [target, rowIndex],
      func: (tLabel, rIdx) => {
        const q = (tLabel || "").toLowerCase().trim();
        const items = Array.from(
          document.querySelectorAll('a[href], [role="button"], [role="link"], [role="tab"], tr.zA, button')
        ).filter((el) => el instanceof HTMLElement && el.offsetParent !== null);
        let best = null;
        if (rIdx >= 1) {
          const rows = Array.from(document.querySelectorAll("tr.zA"));
          best = rows[rIdx - 1] || items[rIdx - 1];
        } else {
          best = items.find((el) => {
            const txt = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("data-tooltip") || "").toLowerCase();
            return txt.includes(q);
          });
        }
        if (!(best instanceof HTMLElement)) {
          return { ok: false, error: `Could not find "${tLabel}" in Gmail.` };
        }
        best.click();
        return { ok: true, clicked: (best.innerText || best.getAttribute("aria-label") || "item").trim().slice(0, 80) };
      },
    });
    await saveState({ lastTargetTabId: tab.id, lastAction: `Gmail click: ${target || rowIndex}` });
    return { ok: Boolean(clkExec?.result?.ok), result: clkExec?.result || {} };
  }

  // Default: return opened Gmail URL + visible inbox/thread rows
  if (threadId) {
    await sleep(900);
    const [bodyExec] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const main = document.querySelector('[role="main"]');
        const heading = main?.querySelector("h2")?.textContent || document.title;
        const bodyText = (main?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 2600);
        return { title: heading, url: location.href, body: bodyText };
      },
    });
    await saveState({ lastTargetTabId: tab.id, lastAction: "Opened Gmail thread" });
    return { ok: true, result: { status: "opened_email", tabId: tab.id, ...(bodyExec?.result || {}) } };
  }

  const emails = await scrapeGmailRows(tab.id);
  await saveState({ lastTargetTabId: tab.id, lastAction: "Opened Gmail in Chrome" });
  return {
    ok: true,
    result: { status: "opened_gmail", url: targetUrl, tabId: tab.id, visible_emails: emails },
  };
}

// ============================================================================
// 4. REAL WHATSAPP WEB AUTOMATION
// ============================================================================

async function handleWhatsAppAction(payload) {
  const contact = String(payload.contact || "").trim();
  const phone = String(payload.phone || "").replace(/[^\d+]/g, "");
  const message = String(payload.message || "").trim();
  const sendNow = payload.send_now !== false;

  if (phone) {
    const cleanDigits = phone.replace(/^\+/, "");
    const waUrl = `https://web.whatsapp.com/send?phone=${encodeURIComponent(cleanDigits)}&text=${encodeURIComponent(message)}`;
    const tab = await getOrOpenTab(waUrl, null, true);
    await saveState({ lastTargetTabId: tab.id, lastAction: `WhatsApp -> ${phone}` });

    for (let i = 0; i < 24; i++) {
      await sleep(500);
      const [probe] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [sendNow],
        func: (doSend) => {
          if (document.querySelector('canvas[aria-label*="Scan"]')) {
            return { done: true, ok: false, needs_qr_login: true, error: "Please scan the WhatsApp Web QR code once on screen." };
          }
          const sendBtn =
            document.querySelector('button[aria-label="Send"]') ||
            document.querySelector('[data-testid="compose-btn-send"]') ||
            document.querySelector('span[data-icon="send"]')?.closest("button");
          if (sendBtn instanceof HTMLElement) {
            if (doSend) sendBtn.click();
            return { done: true, ok: true, sent: doSend };
          }
          return { done: false };
        },
      });
      if (probe?.result?.done) {
        return {
          ok: Boolean(probe.result.ok),
          result: { tabId: tab.id, phone, message, ...probe.result },
          error: probe.result.error || null,
        };
      }
    }
    return { ok: true, result: { status: "opened_whatsapp_chat", tabId: tab.id, phone, message, url: waUrl } };
  }

  // Contact name search inside WhatsApp Web
  const tab = await getOrOpenTab("https://web.whatsapp.com/", "https://web.whatsapp.com/", true);
  await saveState({ lastTargetTabId: tab.id, lastAction: `WhatsApp Web${contact ? ` (${contact})` : ""}` });
  if (!contact || !message) {
    return { ok: true, result: { status: "opened_whatsapp", tabId: tab.id } };
  }

  for (let i = 0; i < 16; i++) {
    await sleep(500);
    const [exec] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [contact, message, sendNow],
      func: async (contactName, msgText, doSend) => {
        if (document.querySelector('canvas[aria-label*="Scan"]')) {
          return { done: true, ok: false, needs_qr_login: true, error: "Scan WhatsApp Web QR code once to send messages." };
        }
        const searchBox = document.querySelector('div[contenteditable="true"][data-tab="3"]');
        if (!(searchBox instanceof HTMLElement)) return { done: false };
        searchBox.focus();
        document.execCommand("selectAll");
        document.execCommand("insertText", false, contactName);
        await new Promise((r) => setTimeout(r, 1400));

        const spans = Array.from(document.querySelectorAll("span[title]"));
        const targetLower = contactName.toLowerCase();
        const match = spans.find((s) => (s.getAttribute("title") || "").toLowerCase().includes(targetLower));
        if (!(match instanceof HTMLElement)) {
          return { done: true, ok: false, error: `Contact "${contactName}" not found in WhatsApp Web.` };
        }
        (match.closest('[role="listitem"], [role="row"], ._ak8l') || match).click();
        await new Promise((r) => setTimeout(r, 600));

        const msgBox = document.querySelector('div[contenteditable="true"][data-tab="10"]');
        if (!(msgBox instanceof HTMLElement)) {
          return { done: true, ok: false, error: "WhatsApp message box not ready." };
        }
        msgBox.focus();
        document.execCommand("insertText", false, msgText);
        if (doSend) {
          await new Promise((r) => setTimeout(r, 350));
          const sendBtn =
            document.querySelector('button[aria-label="Send"]') ||
            document.querySelector('[data-testid="compose-btn-send"]') ||
            document.querySelector('span[data-icon="send"]')?.closest("button");
          if (sendBtn instanceof HTMLElement) sendBtn.click();
        }
        return { done: true, ok: true, sent: doSend, contact: match.getAttribute("title") || contactName };
      },
    });
    if (exec?.result?.done) {
      return {
        ok: Boolean(exec.result.ok),
        result: { tabId: tab.id, ...exec.result },
        error: exec.result.error || null,
      };
    }
  }
  return { ok: false, error: "WhatsApp Web is still loading — please make sure you're logged in." };
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
        sendResponse({ ok: true, result: { connected: true, version: "2.0.0", tabCount: tabs.length } });
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

      if (action === "open_gmail_tab" || action === "gmail_action") {
        sendResponse(await handleGmailAction(payload));
        return;
      }

      if (action === "whatsapp_action") {
        sendResponse(await handleWhatsAppAction(payload));
        return;
      }

      sendResponse({ ok: false, error: `Unknown Chrome bridge action: ${action}` });
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();
  return true; // keep async channel open
});
