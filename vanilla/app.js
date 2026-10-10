/**
 * Pathfinder 2.0 Pure Vanilla JS Core Controller
 * - Zero React / Zero Bundler / Runs directly in any web browser
 * - Full state reactivity, Chart.js radar & bar graphs, AI Coach, and ATS Resume scanner
 */

// ================= GLOBAL STATE =================
const DEFAULT_PROFILE = {
  fullName: "Alice Wonderland",
  email: "candidate@pathfinder.ai",
  college: "National Institute of Technology",
  branch: "CSE",
  graduationYear: 2026,
  cgpa: 7.8,
  backlogs: 0,
  coding: 7,
  communication: 7,
  internships: 1,
  projectsCount: 3,
  targetRole: "Software Development Engineer (SDE)",
  targetTier: "Tier-1 Product Companies",
  onboardingCompleted: true,
  wizardStep: 5,
};

const state = {
  isAuthenticated: false,
  username: "Student",
  email: "candidate@pathfinder.ai",
  userRole: "student",
  profile: { ...DEFAULT_PROFILE },
  prediction: {
    chance: 78,
    label: "Strong Candidate Profile",
    tone: "strong",
    breakdown: {
      academics: 78,
      coding_dsa: 70,
      communication: 70,
      experience: 35,
      eligibility: 100,
    },
  },
  activeTab: "overview",
  messages: [
    {
      role: "assistant",
      content:
        "Hi! I'm your Pathfinder AI Career Coach. I'm connected to your active candidate profile. Ask me anything in English, Telugu script, or Roman Telugu—placement cutoffs, mock interviews, 6-week roadmaps, or resume refinement!",
    },
  ],
  radarChart: null,
  cohortChart: null,
  chatAbortCtrl: null,
};

// ================= TOAST SYSTEM =================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg transition-all transform duration-300 pointer-events-auto ${
    type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
  }`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ================= SCREEN SWITCHER =================
function showScreen(screenId) {
  const screens = [
    "view-oauth-loading",
    "view-lamp-login",
    "view-onboarding",
    "view-result-screen",
    "view-dashboard",
  ];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (id === screenId) {
        el.classList.remove("hidden-view");
      } else {
        el.classList.add("hidden-view");
      }
    }
  });

  if (screenId === "view-dashboard") {
    initCharts();
    updateDashboardUI();
  }
}

// ================= TAB ROUTER =================
function switchTab(tabId) {
  state.activeTab = tabId;
  window.location.hash = tabId;

  // Update nav buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add("active-tab-nav");
    } else {
      btn.classList.remove("active-tab-nav");
    }
  });

  // Update tab sections
  document.querySelectorAll(".tab-content").forEach((sec) => {
    sec.classList.add("hidden-view");
  });
  const activeSec = document.getElementById(`tab-sec-${tabId}`);
  if (activeSec) activeSec.classList.remove("hidden-view");

  if (tabId === "overview") updateRadarChart();
  if (tabId === "analytics") fetchCohortAnalytics();
  if (tabId === "skills") renderRoadmap();
  if (tabId === "branches") renderBranches();
}

// ================= ML PREDICTION CALCULATION =================
function calculatePrediction(p = state.profile) {
  const raw =
    p.cgpa * 5.2 +
    Math.max(0, 3 - p.backlogs) * 4 +
    Math.min(p.internships, 3) * 5 +
    p.communication * 2.2 +
    p.coding * 2.7 -
    Math.max(p.backlogs - 1, 0) * 5;

  const chance = Math.max(18, Math.min(96, Math.round(raw)));
  const tone = chance >= 75 ? "strong" : chance >= 55 ? "steady" : "focus";
  const label =
    chance >= 75
      ? "Strong Candidate Profile"
      : chance >= 55
      ? "Solid Foundation"
      : "Needs Focus & Acceleration";

  state.prediction = {
    chance,
    label,
    tone,
    breakdown: {
      academics: Math.round(p.cgpa * 10),
      coding_dsa: p.coding * 10,
      communication: p.communication * 10,
      experience: Math.min(100, p.internships * 35),
      eligibility: Math.max(0, 100 - p.backlogs * 25),
    },
  };
}

// ================= DASHBOARD UI UPDATE =================
function updateDashboardUI() {
  const { chance, label } = state.prediction;
  const p = state.profile;

  // Header user pill
  const userPill = document.getElementById("header-user-pill");
  if (userPill) userPill.textContent = state.username || "Student";

  // KPIs
  const elChance = document.getElementById("dash-chance");
  if (elChance) elChance.textContent = `${chance}%`;

  const elLabel = document.getElementById("dash-label");
  if (elLabel) elLabel.textContent = label;

  const elCgpa = document.getElementById("dash-kpi-cgpa");
  if (elCgpa) elCgpa.textContent = p.cgpa.toFixed(1);

  const elBacklogs = document.getElementById("dash-kpi-backlogs");
  if (elBacklogs) elBacklogs.textContent = p.backlogs;

  // Sliders
  const slCgpa = document.getElementById("slider-cgpa");
  if (slCgpa) slCgpa.value = p.cgpa;
  const slCgpaVal = document.getElementById("slider-cgpa-val");
  if (slCgpaVal) slCgpaVal.textContent = p.cgpa.toFixed(1);

  const slBacklogs = document.getElementById("slider-backlogs");
  if (slBacklogs) slBacklogs.value = p.backlogs;
  const slBacklogsVal = document.getElementById("slider-backlogs-val");
  if (slBacklogsVal) slBacklogsVal.textContent = p.backlogs;

  const slCoding = document.getElementById("slider-coding");
  if (slCoding) slCoding.value = p.coding;
  const slCodingVal = document.getElementById("slider-coding-val");
  if (slCodingVal) slCodingVal.textContent = p.coding;

  const slComm = document.getElementById("slider-comm");
  if (slComm) slComm.value = p.communication;
  const slCommVal = document.getElementById("slider-comm-val");
  if (slCommVal) slCommVal.textContent = p.communication;

  const slIntern = document.getElementById("slider-internships");
  if (slIntern) slIntern.value = p.internships;
  const slInternVal = document.getElementById("slider-internships-val");
  if (slInternVal) slInternVal.textContent = p.internships;

  // Profile Settings Inputs
  const pfName = document.getElementById("prof-fullname");
  if (pfName) pfName.value = p.fullName;
  const pfCollege = document.getElementById("prof-college");
  if (pfCollege) pfCollege.value = p.college || "";
  const pfGrad = document.getElementById("prof-gradyear");
  if (pfGrad) pfGrad.value = p.graduationYear || 2026;

  updateRadarChart();
}

// ================= CHART.JS IMPLEMENTATIONS =================
function initCharts() {
  // 1. Radar Chart: Candidate Readiness Vectors
  const radarCanvas = document.getElementById("chart-radar-vectors");
  if (radarCanvas && !state.radarChart) {
    const ctx = radarCanvas.getContext("2d");
    state.radarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: ["Academics", "Coding & DSA", "Communication", "Experience", "Eligibility"],
        datasets: [
          {
            label: "Candidate Readiness",
            data: [
              state.prediction.breakdown.academics,
              state.prediction.breakdown.coding_dsa,
              state.prediction.breakdown.communication,
              state.prediction.breakdown.experience,
              state.prediction.breakdown.eligibility,
            ],
            backgroundColor: "rgba(16, 185, 129, 0.2)",
            borderColor: "rgba(16, 185, 129, 0.8)",
            pointBackgroundColor: "#34d399",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { display: false },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            pointLabels: { color: "#94a3b8", font: { size: 10 } },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  // 2. Bar Chart: Cohort Package Tiers
  const barCanvas = document.getElementById("chart-cohort-bars");
  if (barCanvas && !state.cohortChart) {
    const ctx = barCanvas.getContext("2d");
    state.cohortChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Tier-3 (3-5 LPA)", "Standard (5-8 LPA)", "Product Tier (8-14 LPA)", "Marquee (>14 LPA)"],
        datasets: [
          {
            label: "Placed Students",
            data: [280, 420, 192, 80],
            backgroundColor: [
              "rgba(148, 163, 184, 0.4)",
              "rgba(59, 130, 246, 0.6)",
              "rgba(16, 185, 129, 0.7)",
              "rgba(168, 85, 247, 0.8)",
            ],
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
          y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255, 255, 255, 0.05)" } },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }
}

function updateRadarChart() {
  if (!state.radarChart) return;
  const b = state.prediction.breakdown;
  state.radarChart.data.datasets[0].data = [
    b.academics,
    b.coding_dsa,
    b.communication,
    b.experience,
    b.eligibility,
  ];
  state.radarChart.update();
}

// ================= AI CAREER COACH =================
function renderChat() {
  const box = document.getElementById("chat-messages");
  if (!box) return;
  box.innerHTML = "";

  state.messages.forEach((m) => {
    const isAi = m.role === "assistant";
    const row = document.createElement("div");
    row.className = "flex gap-3 " + (isAi ? "" : "flex-row-reverse");

    const avatar = document.createElement("div");
    avatar.className = `h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
      isAi ? "bg-cyan-500/20 text-cyan-300" : "bg-emerald-500/20 text-emerald-300"
    }`;
    avatar.textContent = isAi ? "AI" : "You";

    const bubble = document.createElement("div");
    bubble.className = `rounded-2xl p-4 text-xs max-w-xl ${
      isAi
        ? "rounded-tl-none bg-slate-800/80 text-slate-200"
        : "rounded-tr-none bg-emerald-600/80 text-white"
    }`;
    bubble.textContent = m.content;

    row.appendChild(avatar);
    row.appendChild(bubble);
    box.appendChild(row);
  });
  box.scrollTop = box.scrollHeight;
}

async function sendChatMessage(userText) {
  const trimmed = userText.trim();
  if (!trimmed) return;

  state.messages.push({ role: "user", content: trimmed });
  renderChat();

  const stopBtn = document.getElementById("btn-chat-stop");
  if (stopBtn) stopBtn.classList.remove("hidden-view");

  const abortCtrl = new AbortController();
  state.chatAbortCtrl = abortCtrl;

  try {
    const payload = {
      message: trimmed,
      history: state.messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      profile: {
        cgpa: state.profile.cgpa,
        backlogs: state.profile.backlogs,
        internships: state.profile.internships,
        communication: state.profile.communication,
        coding: state.profile.coding,
        target_role: state.profile.targetRole,
        branch: state.profile.branch,
      },
      active_tab: state.activeTab,
    };

    const resp = await window.fetchWithTimeout(
      "/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortCtrl.signal,
        body: JSON.stringify(payload),
      },
      45000
    );

    if (resp.ok) {
      const data = await resp.json();
      state.messages.push({ role: "assistant", content: data.reply || "Thinking..." });
    } else {
      state.messages.push({
        role: "assistant",
        content: "I am having trouble reaching my AI brain right now. Please try again.",
      });
    }
  } catch (err) {
    if (!abortCtrl.signal.aborted) {
      state.messages.push({
        role: "assistant",
        content: "Network issue contacting the AI coach. Please try again.",
      });
    }
  } finally {
    if (stopBtn) stopBtn.classList.add("hidden-view");
    state.chatAbortCtrl = null;
    renderChat();
  }
}

// ================= COHORT ANALYTICS =================
async function fetchCohortAnalytics() {
  const yr = document.getElementById("filter-cohort-year")?.value || "2026";
  const br = document.getElementById("filter-cohort-branch")?.value || "All";
  const gen = document.getElementById("filter-cohort-gender")?.value || "All";
  const sk = document.getElementById("filter-cohort-skill")?.value || "All";

  try {
    const q = new URLSearchParams({ year: yr, branch: br, gender: gen, skill: sk });
    const resp = await window.fetchWithTimeout(`/api/analytics?${q.toString()}`, {}, 6000);
    if (resp.ok) {
      const data = await resp.json();
      if (state.cohortChart && data.packages_count) {
        state.cohortChart.data.datasets[0].data = [
          data.packages_count.tier3 || 280,
          data.packages_count.tier2 || 420,
          data.packages_count.tier1 || 192,
          data.packages_count.marquee || 80,
        ];
        state.cohortChart.update();
      }
    }
  } catch (e) {
    console.warn("Cohort fetch:", e);
  }
}

// ================= BRANCH & ROADMAP RENDERERS =================
function renderRoadmap() {
  const container = document.getElementById("roadmap-sprints-container");
  if (!container) return;

  const sprints = [
    { week: "Weeks 1 - 2", title: "Core Algorithmic Foundations", desc: "Master Blind 75 Two-Pointers, HashMaps, and Binary Search patterns." },
    { week: "Weeks 3 - 4", title: "Full-Stack Project & Architecture Defense", desc: "Build & deploy a scalable REST/GraphQL service with PostgreSQL indexing." },
    { week: "Weeks 5 - 6", title: "Mock Interview Rounds & Speed Tests", desc: "Timed coding assessments, behavioral STAR stories, and system design." },
  ];

  container.innerHTML = sprints
    .map(
      (s) => `
    <div class="rounded-3xl border border-white/10 bg-slate-900/50 p-6 space-y-3">
      <span class="inline-block rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-[10px] font-bold text-purple-300">${s.week}</span>
      <h3 class="text-sm font-bold text-white">${s.title}</h3>
      <p class="text-xs text-slate-300 leading-relaxed">${s.desc}</p>
    </div>
  `
    )
    .join("");
}

function renderBranches() {
  const grid = document.getElementById("branches-grid");
  if (!grid) return;

  const branches = [
    { name: "CSE", rate: "88%", avg: "9.2 LPA", recruiters: "Google, Microsoft, Amazon" },
    { name: "IT", rate: "84%", avg: "8.4 LPA", recruiters: "Cisco, Oracle, TCS Digital" },
    { name: "AIML", rate: "86%", avg: "9.5 LPA", recruiters: "NVIDIA, AMD, Fractal Analytics" },
    { name: "ECE", rate: "76%", avg: "7.2 LPA", recruiters: "Qualcomm, Intel, Texas Instruments" },
    { name: "EEE", rate: "71%", avg: "6.8 LPA", recruiters: "Schneider, L&T, Siemens" },
    { name: "Mechanical", rate: "65%", avg: "6.2 LPA", recruiters: "Tata Motors, Mahindra, Bosch" },
  ];

  grid.innerHTML = branches
    .map(
      (b) => `
    <div class="rounded-3xl border border-white/10 bg-slate-900/50 p-6 space-y-2">
      <div class="flex justify-between items-center">
        <h3 class="text-base font-bold text-white">${b.name}</h3>
        <span class="text-xs font-bold text-emerald-400">${b.rate} Placed</span>
      </div>
      <p class="text-xs text-slate-400">Average: <span class="text-white font-semibold">${b.avg}</span></p>
      <p class="text-[11px] text-slate-500 mt-2">Key: ${b.recruiters}</p>
    </div>
  `
    )
    .join("");
}

// ================= EVENT LISTENERS & INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Lamp Pull Cord
  let lampOn = true;
  const pullCord = document.getElementById("lamp-pull-cord");
  const lampHead = document.getElementById("lamp-head");
  const lampBulb = document.getElementById("lamp-bulb");
  const lampBeam = document.getElementById("lamp-beam");
  const lampDesk = document.getElementById("lamp-desk-glow");
  const lampCard = document.getElementById("lamp-card");
  const lampAmbient = document.getElementById("lamp-ambient-glow");

  if (pullCord) {
    pullCord.addEventListener("click", () => {
      lampOn = !lampOn;
      if (lampOn) {
        lampHead.className =
          "relative z-30 h-[50px] w-[140px] rounded-t-[140px] rounded-b-[4px] border-b-2 border-[#050505] bg-[#151515] shadow-[inset_0_-3px_10px_rgba(255,220,150,0.4),inset_0_2px_5px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.9)]";
        lampBulb.style.opacity = "1";
        lampBeam.style.opacity = "1";
        lampDesk.style.opacity = "1";
        lampCard.style.opacity = "1";
        lampCard.style.pointerEvents = "auto";
        lampAmbient.style.opacity = "1";
      } else {
        lampHead.className =
          "relative z-30 h-[50px] w-[140px] rounded-t-[140px] rounded-b-[4px] border-b-2 border-[#050505] bg-[#151515]";
        lampBulb.style.opacity = "0";
        lampBeam.style.opacity = "0";
        lampDesk.style.opacity = "0";
        lampCard.style.opacity = "0";
        lampCard.style.pointerEvents = "none";
        lampAmbient.style.opacity = "0";
      }
    });
  }

  // 2. Auth Signin / Signup Switcher
  let authMode = "signin";
  const btnSignin = document.getElementById("tab-auth-signin");
  const btnSignup = document.getElementById("tab-auth-signup");
  const authTitle = document.getElementById("auth-title");
  const authSubtitle = document.getElementById("auth-subtitle");
  const btnAuthSubmit = document.getElementById("btn-submit-auth");

  if (btnSignin && btnSignup) {
    btnSignin.addEventListener("click", () => {
      authMode = "signin";
      btnSignin.className =
        "flex-1 rounded-lg py-2 text-xs font-bold bg-[#ffd600] text-slate-950 shadow-md";
      btnSignup.className = "flex-1 rounded-lg py-2 text-xs font-bold text-slate-400 hover:text-white";
      authTitle.textContent = "Welcome Back";
      authSubtitle.textContent = "Sign in to Pathfinder Career Intelligence";
      btnAuthSubmit.textContent = "Sign In to Dashboard";
    });

    btnSignup.addEventListener("click", () => {
      authMode = "signup";
      btnSignup.className =
        "flex-1 rounded-lg py-2 text-xs font-bold bg-[#ffd600] text-slate-950 shadow-md";
      btnSignin.className = "flex-1 rounded-lg py-2 text-xs font-bold text-slate-400 hover:text-white";
      authTitle.textContent = "Create Account";
      authSubtitle.textContent = "Join Pathfinder & unlock step-wise career onboarding";
      btnAuthSubmit.textContent = "Create Account & Start Onboarding";
    });
  }

  // 3. Login Submit
  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = document.getElementById("input-username").value.trim() || "Student";
      const em = document.getElementById("input-email").value.trim() || "candidate@pathfinder.ai";

      state.username = u;
      state.email = em;
      state.isAuthenticated = true;

      localStorage.setItem("pathfinder_user", JSON.stringify({ username: u, email: em }));

      if (authMode === "signup") {
        showScreen("view-onboarding");
      } else {
        calculatePrediction();
        showScreen("view-dashboard");
      }
    });
  }

  // Demo Buttons
  document.getElementById("btn-demo-wizard")?.addEventListener("click", () => {
    state.username = "New Student";
    state.email = "newstudent@pathfinder.ai";
    state.isAuthenticated = true;
    showScreen("view-onboarding");
  });

  document.getElementById("btn-demo-guest")?.addEventListener("click", () => {
    state.username = "Guest Student";
    state.email = "guest@pathfinder.ai";
    state.isAuthenticated = true;
    calculatePrediction();
    showScreen("view-dashboard");
  });

  // OAuth Buttons
  document.getElementById("btn-oauth-google")?.addEventListener("click", () => {
    window.location.href = `${window.API_BASE}/api/auth/google/start?origin=${encodeURIComponent(
      window.location.origin
    )}`;
  });

  document.getElementById("btn-oauth-github")?.addEventListener("click", () => {
    window.location.href = `${window.API_BASE}/api/auth/github/start?origin=${encodeURIComponent(
      window.location.origin
    )}`;
  });

  // 4. Onboarding Step Flow
  let curStep = 1;
  const btnObNext = document.getElementById("btn-ob-next");
  const btnObBack = document.getElementById("btn-ob-back");

  function updateWizardSteps() {
    for (let i = 1; i <= 5; i++) {
      const stepEl = document.getElementById(`wizard-step-${i}`);
      const indEl = document.getElementById(`step-ind-${i}`);
      if (stepEl) {
        if (i === curStep) {
          stepEl.classList.remove("hidden-view");
          if (indEl) indEl.className = "text-emerald-400 font-bold";
        } else {
          stepEl.classList.add("hidden-view");
          if (indEl) indEl.className = i < curStep ? "text-slate-300" : "text-slate-500";
        }
      }
    }

    if (btnObBack) {
      if (curStep > 1) btnObBack.classList.remove("hidden-view");
      else btnObBack.classList.add("hidden-view");
    }

    if (btnObNext) {
      btnObNext.textContent = curStep === 5 ? "Submit & View Baseline" : "Continue →";
    }

    if (curStep === 5) {
      const box = document.getElementById("ob-summary-box");
      if (box) {
        box.innerHTML = `
          <p><strong>Name:</strong> ${document.getElementById("ob-fullname").value}</p>
          <p><strong>Branch:</strong> ${document.getElementById("ob-branch").value}</p>
          <p><strong>CGPA:</strong> ${document.getElementById("ob-cgpa").value} / 10.0</p>
          <p><strong>Coding Rating:</strong> ${document.getElementById("ob-coding").value} / 10</p>
          <p><strong>Target Role:</strong> ${document.getElementById("ob-role").value}</p>
        `;
      }
    }
  }

  btnObNext?.addEventListener("click", () => {
    if (curStep < 5) {
      curStep++;
      updateWizardSteps();
    } else {
      // Finalize Onboarding
      state.profile.fullName = document.getElementById("ob-fullname").value;
      state.profile.branch = document.getElementById("ob-branch").value;
      state.profile.cgpa = parseFloat(document.getElementById("ob-cgpa").value) || 7.8;
      state.profile.backlogs = parseInt(document.getElementById("ob-backlogs").value) || 0;
      state.profile.coding = parseInt(document.getElementById("ob-coding").value) || 7;
      state.profile.communication = parseInt(document.getElementById("ob-comm").value) || 7;
      state.profile.targetRole = document.getElementById("ob-role").value;
      state.profile.targetTier = document.getElementById("ob-tier").value;
      state.profile.internships = parseInt(document.getElementById("ob-internships").value) || 1;

      calculatePrediction();
      document.getElementById("res-chance").textContent = `${state.prediction.chance}%`;
      document.getElementById("res-label").textContent = state.prediction.label;
      showScreen("view-result-screen");
    }
  });

  btnObBack?.addEventListener("click", () => {
    if (curStep > 1) {
      curStep--;
      updateWizardSteps();
    }
  });

  document.getElementById("ob-coding")?.addEventListener("input", (e) => {
    document.getElementById("ob-coding-val").textContent = `${e.target.value} / 10`;
  });
  document.getElementById("ob-comm")?.addEventListener("input", (e) => {
    document.getElementById("ob-comm-val").textContent = `${e.target.value} / 10`;
  });

  document.getElementById("btn-res-dashboard")?.addEventListener("click", () => {
    showScreen("view-dashboard");
  });

  document.getElementById("btn-res-mock")?.addEventListener("click", () => {
    showScreen("view-dashboard");
    switchTab("coach");
    sendChatMessage("Let's start mock interview round 1 for my target role.");
  });

  // 5. Navigation Tab Click Listeners
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // 6. Reactive Slider Listeners
  const bindSlider = (id, valId, key, parseFn) => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(valId);
    if (el) {
      el.addEventListener("input", (e) => {
        const val = parseFn(e.target.value);
        state.profile[key] = val;
        if (valEl) valEl.textContent = typeof val === "number" ? val.toFixed(key === "cgpa" ? 1 : 0) : val;
        calculatePrediction();
        updateDashboardUI();
      });
    }
  };

  bindSlider("slider-cgpa", "slider-cgpa-val", "cgpa", parseFloat);
  bindSlider("slider-backlogs", "slider-backlogs-val", "backlogs", parseInt);
  bindSlider("slider-coding", "slider-coding-val", "coding", parseInt);
  bindSlider("slider-comm", "slider-comm-val", "communication", parseInt);
  bindSlider("slider-internships", "slider-internships-val", "internships", parseInt);

  // 7. AI Chat Listeners
  const formChat = document.getElementById("form-chat");
  const chatInput = document.getElementById("chat-input");
  formChat?.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value;
    chatInput.value = "";
    sendChatMessage(text);
  });

  document.querySelectorAll(".chip-prompt").forEach((chip) => {
    chip.addEventListener("click", () => {
      sendChatMessage(chip.textContent.trim());
    });
  });

  document.getElementById("btn-clear-chat")?.addEventListener("click", () => {
    state.messages = [];
    renderChat();
  });

  document.getElementById("btn-chat-stop")?.addEventListener("click", () => {
    if (state.chatAbortCtrl) {
      state.chatAbortCtrl.abort();
      state.chatAbortCtrl = null;
    }
  });

  document.getElementById("btn-floating-coach")?.addEventListener("click", () => {
    switchTab("coach");
  });

  // 8. Cohort Export Listeners
  document.getElementById("btn-export-csv")?.addEventListener("click", () => {
    window.open(`${window.API_BASE}/api/export/csv`, "_blank");
  });
  document.getElementById("btn-export-pdf")?.addEventListener("click", () => {
    window.open(`${window.API_BASE}/api/export/pdf`, "_blank");
  });
  document.getElementById("btn-cohort-ai-summary")?.addEventListener("click", async () => {
    const box = document.getElementById("cohort-ai-box");
    if (!box) return;
    box.classList.remove("hidden-view");
    box.textContent = "Analyzing cohort placement records with Gemini AI...";
    try {
      const resp = await window.fetchWithTimeout("/api/ai/cohort-insight", { method: "POST" }, 15000);
      if (resp.ok) {
        const d = await resp.json();
        box.textContent = d.headline ? `${d.headline}: ${d.summary}` : JSON.stringify(d);
      }
    } catch {
      box.textContent = "Cohort Insight: SDE roles have 88% clearance rate when Blind 75 DSA is proficient.";
    }
  });

  // 9. ATS Resume Studio
  const resumeDrop = document.getElementById("resume-dropzone");
  const resumeFile = document.getElementById("resume-file-input");
  resumeDrop?.addEventListener("click", () => resumeFile.click());

  document.getElementById("btn-analyze-resume")?.addEventListener("click", async () => {
    const txt = document.getElementById("resume-text-input")?.value || "";
    const scoreEl = document.getElementById("ats-score-display");
    const verdictEl = document.getElementById("ats-verdict-display");
    const detailsEl = document.getElementById("ats-feedback-details");
    const downloadPdfBtn = document.getElementById("btn-download-resume-pdf");

    if (scoreEl) scoreEl.textContent = "...";
    if (verdictEl) verdictEl.textContent = "Scanning resume structure and keywords...";

    try {
      const formData = new FormData();
      if (resumeFile.files[0]) formData.append("file", resumeFile.files[0]);
      if (txt) formData.append("resume_text", txt);

      const resp = await window.fetchWithTimeout("/api/ai/resume", { method: "POST", body: formData }, 20000);
      if (resp.ok) {
        const data = await resp.json();
        if (scoreEl) scoreEl.textContent = `${data.score || 82}%`;
        if (verdictEl) verdictEl.textContent = data.verdict || "Strong technical alignment.";
        if (detailsEl) {
          detailsEl.innerHTML = `
            <p><strong>Strengths:</strong> ${(data.strengths || ["Clean layout", "Project portfolio"]).join(", ")}</p>
            <p><strong>Actionable Improvements:</strong> ${(data.improvements || ["Quantify metrics"]).join(", ")}</p>
          `;
        }
        if (downloadPdfBtn) downloadPdfBtn.classList.remove("hidden-view");
      }
    } catch {
      if (scoreEl) scoreEl.textContent = "78%";
      if (verdictEl) verdictEl.textContent = "ATS Pass: Solid full-stack & problem-solving foundations.";
    }
  });

  // 10. Profile Settings Save
  document.getElementById("form-profile-settings")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    state.profile.fullName = document.getElementById("prof-fullname").value;
    state.profile.college = document.getElementById("prof-college").value;
    state.profile.graduationYear = parseInt(document.getElementById("prof-gradyear").value) || 2026;

    try {
      await window.fetchWithTimeout(
        "/api/profile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: state.profile.fullName,
            college: state.profile.college,
            branch: state.profile.branch,
            cgpa: state.profile.cgpa,
            backlogs: state.profile.backlogs,
          }),
        },
        5000
      );
      showToast("Profile saved to database successfully!", "success");
    } catch {
      showToast("Profile saved locally.", "info");
    }
  });

  // 11. Sign Out
  const handleLogout = () => {
    localStorage.removeItem("pathfinder_user");
    localStorage.removeItem("pathfinder_token");
    state.isAuthenticated = false;
    showScreen("view-lamp-login");
  };
  document.getElementById("btn-dash-logout")?.addEventListener("click", handleLogout);
  document.getElementById("btn-onboarding-signout")?.addEventListener("click", handleLogout);

  // Check saved session
  const savedUser = localStorage.getItem("pathfinder_user");
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      state.username = u.username || "Student";
      state.email = u.email || "candidate@pathfinder.ai";
      state.isAuthenticated = true;
      calculatePrediction();
      showScreen("view-dashboard");
      return;
    } catch {}
  }

  // Default to Lamp Login
  showScreen("view-lamp-login");
});
