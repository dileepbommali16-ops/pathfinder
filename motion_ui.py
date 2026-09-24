"""Pathfinder motion UI (original Canvas 2D scenes for Streamlit).

Two scenes are injected as a fixed full-page <canvas> behind the Streamlit app:

* "login" - a warm radial spark burst that expands and contracts around a
  bright core, on a dark background (Brand-Orbs style).
* "main"  - a living-green moss world: ferns, pale flowers, drifting pollen and a
  butterfly, plus a small spark-burst orb in the hero card.

These are original implementations inspired by the ThreeUI component briefs;
they are NOT the ThreeUI source code.
"""

_COMMON = r"""
(function () {
  var P = window.parent, D = P.document;
  try { if (P.__pfStop) P.__pfStop(); } catch (e) {}
  var alive = true, timers = [];
  var reduce = !!(P.matchMedia && P.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var old = D.getElementById('pf-scene-canvas'); if (old) old.remove();
  var cv = D.createElement('canvas');
  cv.id = 'pf-scene-canvas';
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;';
  D.body.insertBefore(cv, D.body.firstChild);
  var ctx = cv.getContext('2d'), W = 0, H = 0, DPR = 1, TAU = Math.PI * 2;
  function resize() {
    DPR = Math.min(P.devicePixelRatio || 1, 2);
    W = P.innerWidth; H = P.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize(); P.addEventListener('resize', resize);
  P.__pfStop = function () {
    alive = false;
    P.removeEventListener('resize', resize);
    timers.forEach(function (t) { clearInterval(t); });
    if (cv.parentNode) cv.parentNode.removeChild(cv);
    var o = D.querySelectorAll('.pf-hero-orb');
    for (var i = 0; i < o.length; i++) o[i].remove();
  };
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- warm spark burst (expands / contracts around a bright core) ---- */
  function makeBurst(n, seed) {
    var r = rng(seed), a = [];
    for (var i = 0; i < n; i++) {
      a.push({ ang: (i / n) * TAU + (r() - 0.5) * 0.05, len: 0.10 + r() * 0.30,
               r0: 0.10 + r() * 0.20, ph: r() * TAU, w: 0.6 + r() * 1.0, hue: r() });
    }
    return a;
  }
  function drawBurst(c, sparks, cx, cy, R, t, light, alpha) {
    var breath = 0.5 + 0.5 * Math.sin(t * 0.9);
    var cr = R * (0.14 + 0.10 * breath);
    c.globalCompositeOperation = light ? 'source-over' : 'lighter';
    var g = c.createRadialGradient(cx, cy, 0, cx, cy, cr * 2.4);
    g.addColorStop(0, 'rgba(255,248,232,' + (0.95 * alpha) + ')');
    g.addColorStop(0.35, 'rgba(255,186,116,' + (0.55 * alpha) + ')');
    g.addColorStop(1, 'rgba(226,86,43,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, cr * 2.4, 0, TAU); c.fill();
    c.lineCap = 'round';
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      var b = 0.5 + 0.5 * Math.sin(t * s.w * 0.9 + s.ph);
      var e = 0.55 + 0.45 * Math.sin(t * 0.9 + s.ph * 0.15);
      var r1 = R * s.r0 * (0.6 + 0.4 * e);
      var r2 = r1 + R * s.len * (0.4 + 0.9 * e) * (0.6 + 0.4 * b);
      var ca = Math.cos(s.ang), sa = Math.sin(s.ang);
      var a = (0.18 + 0.62 * b) * alpha;
      var gg = light ? Math.round(96 + s.hue * 40) : Math.round(150 + s.hue * 70);
      var bb = light ? Math.round(40 + s.hue * 20) : Math.round(80 + s.hue * 60);
      var rr = light ? 226 : 255;
      c.strokeStyle = 'rgba(' + rr + ',' + gg + ',' + bb + ',' + a + ')';
      c.lineWidth = 0.9 + s.w * 0.8;
      c.beginPath();
      c.moveTo(cx + ca * r1, cy + sa * r1);
      c.lineTo(cx + ca * r2, cy + sa * r2);
      c.stroke();
      c.fillStyle = 'rgba(' + rr + ',' + Math.min(255, gg + 30) + ',' + (bb + 30) + ',' + Math.min(1, a + 0.15) + ')';
      c.beginPath(); c.arc(cx + ca * r2, cy + sa * r2, 0.9 + s.w * 0.9, 0, TAU); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }
"""

_LOOP = r"""
  var t0 = P.performance.now();
  function frame(now) {
    if (!alive) return;
    draw((now - t0) / 1000);
    P.requestAnimationFrame(frame);
  }
  if (reduce) { draw(2.0); } else { P.requestAnimationFrame(frame); }
})();
"""

_LOGIN_JS = r"""
  var sparks = makeBurst(230, 7);
  var rr = rng(21), embers = [];
  for (var i = 0; i < 46; i++) embers.push({ x: rr(), y: rr(), v: 0.006 + rr() * 0.02, r: 0.6 + rr() * 1.6, ph: rr() * TAU });
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.36, R = Math.min(W, H) * 0.36;
    var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.65);
    bg.addColorStop(0, 'rgba(96,44,18,0.55)');
    bg.addColorStop(0.5, 'rgba(34,17,10,0.30)');
    bg.addColorStop(1, 'rgba(8,7,10,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    var breath = 0.5 + 0.5 * Math.sin(t * 0.9);
    ctx.strokeStyle = 'rgba(255,170,110,0.10)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R * (0.62 + 0.06 * breath), 0, TAU); ctx.stroke();
    drawBurst(ctx, sparks, cx, cy, R, t, false, 1);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < embers.length; i++) {
      var m = embers[i];
      var y = ((m.y - t * m.v) % 1 + 1) % 1;
      var x = m.x + Math.sin(t * 0.5 + m.ph) * 0.02;
      var a = 0.25 + 0.35 * Math.sin(t * 1.3 + m.ph);
      ctx.fillStyle = 'rgba(255,176,110,' + Math.max(0.05, a) + ')';
      ctx.beginPath(); ctx.arc(x * W, y * H, m.r, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
"""

_MAIN_JS = r"""
  var sparks = makeBurst(120, 11);
  var R2 = rng(5), pollen = [];
  for (var i = 0; i < 70; i++) pollen.push({ x: R2(), y: R2(), vx: 0.004 + R2() * 0.01, vy: -(0.002 + R2() * 0.008), r: 0.8 + R2() * 1.8, ph: R2() * TAU });
  var heroOrb = null;
  function ensureHeroOrb() {
    var hero = D.querySelector('.hero');
    if (!hero) { heroOrb = null; return; }
    var c = hero.querySelector('.pf-hero-orb');
    if (!c) {
      c = D.createElement('canvas'); c.className = 'pf-hero-orb';
      c.width = Math.round(112 * DPR); c.height = Math.round(112 * DPR);
      c.style.cssText = 'position:absolute;right:22px;top:50%;transform:translateY(-50%);width:112px;height:112px;pointer-events:none;';
      hero.appendChild(c);
    }
    heroOrb = c;
  }
  ensureHeroOrb();
  timers.push(setInterval(ensureHeroOrb, 700));

  function fern(x, y, ang, len, dir, t, seed, tone) {
    var N = 24, step = len / N, px = x, py = y;
    ctx.lineCap = 'round';
    for (var i = 0; i < N; i++) {
      var k = i / N;
      var a = ang + dir * k * 1.15 + Math.sin(t * 0.6 + seed + k * 1.6) * 0.10 * k;
      var nx = px + Math.sin(a) * step, ny = py - Math.cos(a) * step;
      ctx.strokeStyle = 'rgba(' + tone + ',0.78)';
      ctx.lineWidth = 2.6 * (1 - k) + 0.7;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      if (i > 1) {
        var ll = len * 0.30 * Math.pow(1 - k, 0.75) + 3;
        ctx.lineWidth = 1.7 * (1 - k) + 0.5;
        ctx.strokeStyle = 'rgba(' + tone + ',0.6)';
        for (var sd = -1; sd <= 1; sd += 2) {
          var la = a + sd * (1.0 + Math.sin(t * 0.8 + seed + i * 0.4) * 0.05);
          ctx.beginPath(); ctx.moveTo(nx, ny);
          ctx.lineTo(nx + Math.sin(la) * ll, ny - Math.cos(la) * ll); ctx.stroke();
        }
      }
      px = nx; py = ny;
    }
  }
  function flower(x, y, h, t, seed) {
    var sw = Math.sin(t * 0.7 + seed) * 10, tx = x + sw, ty = y - h;
    ctx.strokeStyle = 'rgba(60,178,116,0.9)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.3, y - h * 0.5, tx, ty); ctx.stroke();
    var fg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 30);
    fg.addColorStop(0, 'rgba(140,255,200,0.22)'); fg.addColorStop(1, 'rgba(140,255,200,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(tx, ty, 30, 0, TAU); ctx.fill();
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * TAU + t * 0.05;
      ctx.save(); ctx.translate(tx + Math.cos(a) * 8, ty + Math.sin(a) * 8); ctx.rotate(a);
      ctx.fillStyle = 'rgba(176,240,206,0.93)'; ctx.strokeStyle = 'rgba(110,210,160,0.55)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = '#f0c552'; ctx.beginPath(); ctx.arc(tx, ty, 4.6, 0, TAU); ctx.fill();
  }
  function moss(x, y, rx, ry, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(46,170,108,' + a + ')'); g.addColorStop(1, 'rgba(46,170,108,0)');
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  function butterfly(t) {
    function pos(tt) {
      var u = tt * 0.11;
      return [W * (0.5 + 0.36 * Math.sin(u + 0.5)), H * (0.42 + 0.16 * Math.sin(u * 1.7)) + Math.sin(tt * 3) * 6];
    }
    var p = pos(t), q = pos(t + 0.05), hd = Math.atan2(q[1] - p[1], q[0] - p[0]);
    var flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 7.5));
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(hd + Math.PI / 2); ctx.scale(0.8, 0.8);
    for (var sd = -1; sd <= 1; sd += 2) {
      ctx.save(); ctx.scale(sd * flap, 1);
      ctx.fillStyle = 'rgba(247,183,77,0.95)'; ctx.strokeStyle = 'rgba(80,46,22,0.65)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, -2); ctx.bezierCurveTo(22, -30, 46, -18, 34, 2); ctx.bezierCurveTo(28, 8, 8, 6, 0, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(234,130,58,0.93)';
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.bezierCurveTo(24, 4, 34, 24, 16, 26); ctx.bezierCurveTo(6, 26, 2, 14, 0, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,248,226,0.9)';
      ctx.beginPath(); ctx.arc(30, -6, 2.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(16, 18, 1.8, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#3b2a1c'; ctx.beginPath(); ctx.ellipse(0, 2, 2.2, 10, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, '#04100b'); g.addColorStop(0.55, '#0a2117'); g.addColorStop(1, '#05150e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var sh = ctx.createRadialGradient(W * 0.12, -H * 0.05, 0, W * 0.12, -H * 0.05, Math.max(W, H) * 0.7);
    sh.addColorStop(0, 'rgba(90,230,160,0.16)'); sh.addColorStop(1, 'rgba(90,230,160,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
    // moss mounds
    moss(W * 0.12, H, W * 0.30, H * 0.20, 0.42); moss(W * 0.55, H + 20, W * 0.34, H * 0.14, 0.30); moss(W * 0.92, H, W * 0.30, H * 0.22, 0.42);
    // ferns
    var s = Math.max(0.7, Math.min(1.4, H / 800));
    fern(W * 0.03, H + 6, 0.35, 330 * s, 1, t, 0.5, '44,176,112');
    fern(W * 0.08, H + 6, 0.10, 250 * s, 1, t, 1.7, '84,214,146');
    fern(W * 0.97, H + 6, -0.35, 330 * s, -1, t, 2.6, '44,176,112');
    fern(W * 0.92, H + 6, -0.10, 250 * s, -1, t, 3.9, '84,214,146');
    fern(W * 0.50, H + 10, 0.0, 150 * s, 1, t, 4.4, '120,232,170');
    // flowers
    flower(W * 0.16, H + 4, 150 * s, t, 0.3); flower(W * 0.21, H + 4, 108 * s, t, 1.2);
    flower(W * 0.83, H + 4, 130 * s, t, 2.2); flower(W * 0.88, H + 4, 172 * s, t, 3.1); flower(W * 0.58, H + 4, 84 * s, t, 4.0);
    // pollen
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < pollen.length; i++) {
      var p = pollen[i];
      var x = ((p.x + t * p.vx) % 1 + 1) % 1, y = ((p.y + t * p.vy) % 1 + 1) % 1;
      x += Math.sin(t * 0.7 + p.ph) * 0.006;
      var a = 0.45 + 0.35 * Math.sin(t * 1.1 + p.ph);
      ctx.fillStyle = 'rgba(255,236,150,' + (0.14 * a) + ')'; ctx.beginPath(); ctx.arc(x * W, y * H, p.r * 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,170,' + a + ')'; ctx.beginPath(); ctx.arc(x * W, y * H, p.r, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // soft warm orb (top-right) + butterfly
    drawBurst(ctx, sparks, W - 150, 130, 105, t, false, 0.55);
    butterfly(t);
    // hero orb
    if (heroOrb && heroOrb.isConnected) {
      var oc = heroOrb.getContext('2d');
      oc.setTransform(DPR, 0, 0, DPR, 0, 0); oc.clearRect(0, 0, 112, 112);
      drawBurst(oc, sparks, 56, 56, 50, t, false, 1);
    }
  }
"""


def _script(scene_js: str) -> str:
    return "<script>" + _COMMON + scene_js + _LOOP + "</script>"


LOGIN_SCRIPT = _script(_LOGIN_JS)
MAIN_SCRIPT = _script(_MAIN_JS)


LOGIN_CSS = """
<style>
/* ===== Login: dark warm spark-burst scene ===== */
html:has(.login-screen) { background:#08070a !important; }
body:has(.login-screen) { background:transparent !important; }
body:has(.login-screen) {
  --pf-text:#f6efe6; --pf-muted:#b9a99a;
}
body:has(.login-screen) .stApp,
body:has(.login-screen) [data-testid="stAppViewContainer"],
body:has(.login-screen) [data-testid="stMain"],
body:has(.login-screen) [data-testid="stHeader"] { background:transparent !important; }
body:has(.login-screen) [data-testid="stAppViewContainer"]::before,
body:has(.login-screen) [data-testid="stAppViewContainer"]::after,
.login-screen::before, .login-screen::after,
.login-sylva-orb, .login-sylva-leaf { display:none !important; }

body:has(.login-screen) .login-screen {
  background:linear-gradient(145deg,rgba(28,18,14,.62),rgba(14,10,10,.52)) !important;
  border:1px solid rgba(255,170,110,.22) !important;
  box-shadow:0 30px 90px rgba(0,0,0,.55), 0 0 80px rgba(226,86,43,.10), inset 0 1px rgba(255,255,255,.08) !important;
  backdrop-filter:blur(16px) saturate(120%);
}
body:has(.login-screen) .login-screen h1 { color:#fff5e8 !important; }
body:has(.login-screen) .login-screen h1::after { background:linear-gradient(90deg,transparent,#ffb37a,#e2562b,transparent) !important; box-shadow:0 0 18px rgba(255,150,90,.6) !important; }
body:has(.login-screen) .login-screen p { color:#d9c8b8 !important; }
body:has(.login-screen) [data-testid="stForm"] {
  background:rgba(22,16,14,.72) !important;
  border:1px solid rgba(255,170,110,.18) !important;
  box-shadow:0 20px 60px rgba(0,0,0,.45) !important;
}
body:has(.login-screen) [data-testid="stForm"] input {
  color:#fff5e8 !important; background:transparent !important; border-color:transparent !important; box-shadow:none !important;
}
body:has(.login-screen) [data-baseweb="input"] {
  background:rgba(10,8,8,.82) !important; border:1px solid rgba(255,170,110,.25) !important; border-radius:12px !important;
}
body:has(.login-screen) [data-baseweb="base-input"] { background:transparent !important; }
body:has(.login-screen) [data-baseweb="input"]:focus-within { border-color:rgba(255,160,100,.7) !important; box-shadow:0 0 0 4px rgba(255,140,80,.12) !important; }
body:has(.login-screen) input::placeholder { color:#8f7f70 !important; }
body:has(.login-screen) [data-baseweb="tab-list"] { background:rgba(255,255,255,.06) !important; }
body:has(.login-screen) [data-baseweb="tab"] { color:#cbb9a8 !important; }
body:has(.login-screen) [data-baseweb="tab"][aria-selected="true"] { color:#ffb37a !important; background:rgba(255,255,255,.09) !important; box-shadow:none; }
body:has(.login-screen) [data-testid="stCaptionContainer"] { color:#b9a99a !important; }
body:has(.login-screen) .stButton > button {
  color:#1c0d05 !important; font-weight:700 !important;
  background:linear-gradient(135deg,#ffb37a,#ff8a4c 55%,#e2562b) !important;
  box-shadow:0 10px 26px rgba(226,86,43,.28) !important;
}
body:has(.login-screen) .stButton > button:hover { box-shadow:0 16px 36px rgba(255,120,60,.42) !important; }
</style>
"""

MAIN_CSS = """
<style>
/* ===== Main app: dark living-green scene ===== */
html:not(:has(.login-screen)) { background:#06120d !important; }
body:not(:has(.login-screen)) { background:transparent !important; }
body:not(:has(.login-screen)) .stApp,
body:not(:has(.login-screen)) [data-testid="stAppViewContainer"],
body:not(:has(.login-screen)) [data-testid="stMain"],
body:not(:has(.login-screen)) [data-testid="stHeader"] { background:transparent !important; }
body:not(:has(.login-screen)) [data-testid="stAppViewContainer"]::before,
body:not(:has(.login-screen)) [data-testid="stAppViewContainer"]::after,
.pf-data-arc, .pf-bg-advanced { display:none !important; }
.hero { position:relative; overflow:hidden; padding-right:150px !important; }
body:not(:has(.login-screen)) .stButton > button,
body:not(:has(.login-screen)) .stDownloadButton > button {
  color:#eafff2 !important;
  background:linear-gradient(135deg,#1f8f5f,#1a9c8c) !important;
  box-shadow:0 9px 22px rgba(26,156,140,.28) !important;
}
body:not(:has(.login-screen)) .stButton > button:hover { box-shadow:0 14px 30px rgba(63,191,133,.38) !important; }
body:not(:has(.login-screen)) [data-baseweb="tab"][aria-selected="true"] { color:#8fe6b4 !important; background:rgba(63,191,133,.14) !important; }
body:not(:has(.login-screen)) [data-testid="stSlider"] [role="slider"] {
  background:#3fbf85 !important; border-color:#3fbf85 !important; box-shadow:0 0 0 4px rgba(63,191,133,.18) !important;
}
body:not(:has(.login-screen)) [data-testid="stProgressBar"] > div > div { background:linear-gradient(90deg,#1f8f5f,#6fe3a5,#f0c552) !important; }
</style>
"""

# Dark overrides for every page: no white surfaces, no black text.
DARK_CSS = """
<style>
:root { --pf-bg:#06120d; --pf-surface:rgba(12,32,24,.74); --pf-surface-strong:#0d2118; --pf-border:rgba(120,220,170,.18); --pf-text:#e3f1e6; --pf-muted:#9dbba8; color-scheme:dark; }
body:not(:has(.login-screen)) { --pf-text:#e3f1e6; --pf-muted:#9dbba8; }
h1,h2,h3,h4,h5,h6 { color:var(--pf-text) !important; }
p, li, label, .stMarkdown, [data-testid="stMarkdownContainer"], [data-testid="stWidgetLabel"] { color:var(--pf-text) !important; }
.stCaption, [data-testid="stCaptionContainer"], [data-testid="stCaptionContainer"] * { color:var(--pf-muted) !important; }
.hero p { color:var(--pf-muted) !important; }
.hero, .pf-hero {
  background:linear-gradient(135deg,rgba(14,42,31,.88),rgba(8,24,18,.80)) !important;
  border:1px solid var(--pf-border) !important; box-shadow:0 14px 40px rgba(0,0,0,.35) !important;
}
body [data-testid="stSidebar"], body section[data-testid="stSidebar"] {
  background:linear-gradient(180deg,rgba(6,20,14,.94),rgba(10,30,22,.90)) !important;
  border-right:1px solid var(--pf-border) !important; box-shadow:8px 0 30px rgba(0,0,0,.30) !important;
}
body section[data-testid="stSidebar"] *, body [data-testid="stSidebar"] * { color:var(--pf-text) !important; }
body section[data-testid="stSidebar"] [data-testid="stCaptionContainer"] * { color:var(--pf-muted) !important; }
.profile-section-label { color:#7fdcae !important; }
div[data-testid="stVerticalBlockBorderWrapper"], [data-testid="stMetric"], div[data-testid="stMetric"],
[data-testid="stExpander"], [data-testid="stTabs"], [data-testid="stChatMessage"] {
  background:var(--pf-surface) !important; border:1px solid var(--pf-border) !important; color:var(--pf-text) !important;
  box-shadow:0 12px 34px rgba(0,0,0,.32) !important;
}
[data-testid="stMetricLabel"], div[data-testid="stMetricLabel"], [data-testid="stMetricLabel"] * { color:var(--pf-muted) !important; }
[data-testid="stMetricValue"], div[data-testid="stMetricValue"], [data-testid="stMetricValue"] * { color:#f1e8c9 !important; }
[data-testid="stExpander"] summary, [data-testid="stExpander"] summary * { color:var(--pf-text) !important; }
.stTextInput input, .stNumberInput input, .stTextArea textarea, [data-testid="stChatInput"] textarea,
[data-testid="stTextInput"] input, [data-testid="stNumberInput"] input, [data-testid="stTextArea"] textarea {
  background:rgba(4,16,11,.92) !important; color:var(--pf-text) !important; border:1px solid var(--pf-border) !important; border-radius:12px !important; box-shadow:none !important;
}
[data-baseweb="input"], [data-baseweb="textarea"], [data-baseweb="select"] > div, [data-baseweb="base-input"] {
  background:rgba(4,16,11,.92) !important; color:var(--pf-text) !important; border-color:var(--pf-border) !important;
}
[data-baseweb="select"] *, [data-baseweb="input"] * { color:var(--pf-text) !important; }
[data-baseweb="popover"], [data-baseweb="popover"] > div, [data-baseweb="menu"], ul[role="listbox"] { background:#0d2118 !important; }
[data-baseweb="popover"] li, [data-baseweb="menu"] li, ul[role="listbox"] li { background:#0d2118 !important; color:var(--pf-text) !important; }
[data-baseweb="popover"] li:hover, [data-baseweb="menu"] li:hover, ul[role="listbox"] li:hover { background:#16382a !important; }
[data-baseweb="tab-list"] { background:rgba(255,255,255,.05) !important; }
[data-baseweb="tab"], button[data-baseweb="tab"] { color:#a9c7b4 !important; }
[data-testid="stFileUploaderDropzone"] { background:rgba(4,16,11,.75) !important; border:1px dashed var(--pf-border) !important; }
[data-testid="stFileUploaderDropzone"] * { color:var(--pf-muted) !important; }
[data-testid="stFileUploaderDropzone"] button { color:#eafff2 !important; }
[data-testid="stAlert"], div[data-testid="stAlert"] { background:rgba(16,46,34,.78) !important; border:1px solid var(--pf-border) !important; }
[data-testid="stAlert"] *, div[data-testid="stAlert"] * { color:var(--pf-text) !important; }
[data-testid="stBottom"], [data-testid="stBottom"] > div, [data-testid="stChatInput"], [data-testid="stChatInput"] > div { background:transparent !important; }
[data-testid="stChatInput"] > div { background:rgba(4,16,11,.92) !important; border:1px solid var(--pf-border) !important; }
[data-testid="stDataFrame"], div[data-testid="stDataFrame"] { border:1px solid var(--pf-border) !important; background:rgba(4,16,11,.8) !important; }
pre, code, [data-testid="stCode"] { background:rgba(4,16,11,.9) !important; color:#bfeed3 !important; }
[data-testid="stToolbar"] *, [data-testid="stHeader"] * { color:var(--pf-text) !important; }
.pf-gauge { background:rgba(157,187,168,.18) !important; }
.pf-badge { background:rgba(63,191,133,.14) !important; color:#8fe6b4 !important; }
</style>
"""

# Hides the zero-height helper iframe that runs the scene script.
HELPER_CSS = """
<style>
[data-testid="stElementContainer"]:has(iframe[height="0"]),
[data-testid="element-container"]:has(iframe[height="0"]) { position:absolute !important; height:0 !important; margin:0 !important; overflow:hidden; }
</style>
"""


def render_scene(st, scene: str) -> None:
    """Inject the CSS theme and the canvas scene ('login' or 'main')."""
    css = LOGIN_CSS if scene == "login" else MAIN_CSS
    st.markdown(HELPER_CSS + DARK_CSS + css, unsafe_allow_html=True)
    script = LOGIN_SCRIPT if scene == "login" else MAIN_SCRIPT
    try:
        import streamlit.components.v1 as components
        components.html(script, height=0)
    except Exception:
        # Motion is decorative; never break the app if the component API changes.
        pass
