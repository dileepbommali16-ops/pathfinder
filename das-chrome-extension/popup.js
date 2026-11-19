document.addEventListener("DOMContentLoaded", async () => {
  const lastActionEl = document.getElementById("lastAction");
  try {
    const data = await chrome.storage.local.get(["lastAction"]);
    if (data?.lastAction && lastActionEl) {
      lastActionEl.textContent = data.lastAction;
    }
  } catch {}

  document.getElementById("openPathfinder")?.addEventListener("click", async () => {
    await chrome.tabs.create({ url: "https://pathfinder-client-fzom.vercel.app/" });
  });

  document.getElementById("openProgramiz")?.addEventListener("click", async () => {
    await chrome.tabs.create({ url: "https://www.programiz.com/c-programming/online-compiler/" });
  });
});
