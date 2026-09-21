/* AGAME+ — portal: router + home */
import "./common.js";
import "./covers.js";
import "./games/snake.js";
import "./games/tetris.js";
import "./games/breakout.js";
import "./games/pong.js";
import "./games/asteroids.js";
import "./games/flappy.js";
import "./games/2048.js";
import "./games/memory.js";
import "./games/simon.js";
import "./games/minesweeper.js";
import "./games/reaction.js";
import "./games/whack.js";
import "./games/typerush.js";
import "./games/chroma.js";
import "./games/lightsout.js";
import "./games/tictactoe.js";

const { GAMES, byId, CAT_LABELS, CAT_EMOJI, hs, recent, sfx, fmtScore, fmtPlays, toast } = AG;

const app = document.getElementById("app");
let shell = null;       // active game shell
let heroAnim = null;    // hero canvas rAF
let currentCat = "all";
let currentQuery = "";

/* ============================================================
   Header
   ============================================================ */
function renderHeader() {
  const h = document.createElement("header");
  h.className = "site-header";
  h.innerHTML = `
    <a class="logo" href="#/">
      <span class="logo-mark">A+</span>
      <span>agame<span class="plus">⁺</span></span>
    </a>
    <div class="header-search">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="search" type="search" placeholder="Search games… (try “snake”)" autocomplete="off" />
    </div>
    <div class="header-right">
      <button class="icon-btn" id="sound" title="Toggle sound (M)" aria-label="Toggle sound">${sfx.muted ? "🔇" : "🔊"}</button>
    </div>`;
  app.appendChild(h);

  h.querySelector("#sound").addEventListener("click", () => {
    const m = sfx.toggle();
    h.querySelector("#sound").textContent = m ? "🔇" : "🔊";
  });
  const input = h.querySelector("#search");
  input.value = currentQuery;
  input.addEventListener("input", () => {
    currentQuery = input.value.trim().toLowerCase();
    if (!location.hash.startsWith("#/play/")) renderHome();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const g = findMatch(currentQuery);
      if (g) location.hash = "#/play/" + g.id;
      else toast("No game found for “" + input.value + "”");
    }
  });
}

function findMatch(q) {
  if (!q) return null;
  return (
    GAMES.find((g) => g.title.toLowerCase() === q) ||
    GAMES.find((g) => g.title.toLowerCase().includes(q) || g.category.includes(q) || g.id.includes(q)) ||
    null
  );
}

/* ============================================================
   Hero with live canvas art
   ============================================================ */
function heroArt(canvas) {
  const g = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const tiles = Array.from({ length: 26 }, () => ({
    x: Math.random(),
    y: Math.random(),
    s: 0.25 + Math.random() * 0.75,
    sp: 0.02 + Math.random() * 0.06,
    hue: [262, 190, 330, 150, 45][Math.floor(Math.random() * 5)],
    ph: Math.random() * 6.28,
  }));

  let t = 0;
  let raf = 0;
  const frame = () => {
    t += 0.016;
    g.clearRect(0, 0, W, H);
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#131a36");
    grad.addColorStop(1, "#0a0e1f");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // grid
    g.strokeStyle = "rgba(148,163,255,0.07)";
    g.lineWidth = 1;
    const step = 44;
    const off = (t * 12) % step;
    for (let x = -step + off; x < W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = -step + off; y < H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // tiles
    for (const tl of tiles) {
      tl.y -= tl.sp * 0.016;
      if (tl.y < -0.1) { tl.y = 1.1; tl.x = Math.random(); }
      const x = tl.x * W + Math.sin(t * 0.7 + tl.ph) * 14;
      const y = tl.y * H;
      const size = 18 + tl.s * 30;
      g.globalAlpha = 0.25 + tl.s * 0.5;
      g.fillStyle = `hsl(${tl.hue} 70% 55%)`;
      g.shadowColor = `hsl(${tl.hue} 80% 60%)`;
      g.shadowBlur = 18;
      rrect(g, x - size / 2, y - size / 2, size, size, size * 0.28);
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = "rgba(255,255,255,0.25)";
      rrect(g, x - size / 2 + 3, y - size / 2 + 3, size - 6, size * 0.16, 3);
      g.fill();
    }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); };
}

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* ============================================================
   Home page
   ============================================================ */
function renderHome() {
  if (shell) { shell.destroy(); shell = null; }
  if (heroAnim) { heroAnim(); heroAnim = null; }
  app.innerHTML = "";
  renderHeader();

  const page = document.createElement("main");
  page.className = "page";

  /* hero */
  const featured = byId.get("tetris");
  const totalPlays = GAMES.reduce((a, g) => a + g.plays, 0);
  const hero = document.createElement("section");
  hero.className = "hero";
  hero.innerHTML = `
    <div>
      <span class="hero-kicker"><span class="dot"></span> ${GAMES.length} hand-built games · zero installs</span>
      <h1>Games that just <span class="grad">work</span>.<br>No downloads. No ads in your face.</h1>
      <p class="sub">Every game on agame⁺ is written from scratch for the browser — crisp canvas graphics, instant load, high scores saved right on your device. Pick one and press play.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#/play/${featured.id}">▶ Play ${featured.title}</a>
        <a class="btn btn-ghost" href="#browse">Browse all games</a>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><div class="n">${GAMES.length}</div><div class="l">Games</div></div>
        <div class="hero-stat"><div class="n">${fmtPlays(totalPlays)}</div><div class="l">Plays & counting</div></div>
        <div class="hero-stat"><div class="n">0</div><div class="l">Downloads needed</div></div>
        <div class="hero-stat"><div class="n">60fps</div><div class="l">Canvas rendering</div></div>
      </div>
    </div>
    <div class="hero-art">
      <canvas id="hero-canvas"></canvas>
      <span class="badge">LIVE DEMO — press play on any card</span>
    </div>`;
  page.appendChild(hero);
  heroAnim = heroArt(hero.querySelector("#hero-canvas"));

  /* mobile search (header search is hidden on small screens) */
  const mSearch = document.createElement("div");
  mSearch.className = "mobile-search";
  mSearch.innerHTML = `
    <div class="header-search" style="max-width:none">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="search-m" type="search" placeholder="Search games…" autocomplete="off" />
    </div>`;
  page.appendChild(mSearch);
  const mi = mSearch.querySelector("#search-m");
  mi.value = currentQuery;
  mi.addEventListener("input", () => {
    currentQuery = mi.value.trim().toLowerCase();
    if (!location.hash.startsWith("#/play/")) renderHome();
  });
  mi.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const g = findMatch(currentQuery);
      if (g) location.hash = "#/play/" + g.id;
      else toast("No game found for “" + mi.value + "”");
    }
  });

  /* recently played */
  const rec = recent.all().map((id) => byId.get(id)).filter(Boolean);
  if (rec.length && !currentQuery) {
    const sec = document.createElement("section");
    sec.className = "section";
    sec.innerHTML = `<div class="section-head"><h2>Jump back in</h2><span class="line"></span></div>`;
    sec.appendChild(gridEl(rec));
    page.appendChild(sec);
  }

  /* browse */
  const browse = document.createElement("section");
  browse.className = "section";
  browse.id = "browse";
  browse.style.scrollMarginTop = "110px";

  const cats = ["all", "arcade", "action", "puzzle", "reflex", "strategy"];
  const pills = document.createElement("div");
  pills.className = "cats";
  pills.innerHTML = cats
    .map((c) => {
      const n = c === "all" ? GAMES.length : GAMES.filter((g) => g.category === c).length;
      const label = c === "all" ? "✦ All" : `${CAT_EMOJI[c]} ${CAT_LABELS[c]}`;
      return `<button class="cat-pill ${c === currentCat ? "active" : ""}" data-cat="${c}">${label} <span class="cnt">${n}</span></button>`;
    })
    .join("");
  browse.appendChild(pills);
  pills.addEventListener("click", (e) => {
    const b = e.target.closest(".cat-pill");
    if (!b) return;
    currentCat = b.dataset.cat;
    sfx.click();
    renderHome();
  });

  const head = document.createElement("div");
  head.className = "section-head";
  const list = filteredGames();
  head.innerHTML = `
    <h2>${currentQuery ? `Results for “${currentQuery}”` : currentCat === "all" ? "All games" : CAT_LABELS[currentCat]}</h2>
    <span class="line"></span>
    <span class="meta">${list.length} game${list.length === 1 ? "" : "s"}</span>`;
  browse.appendChild(head);

  const grid = gridEl(list);
  browse.appendChild(grid);
  page.appendChild(browse);

  app.appendChild(page);

  /* footer */
  app.appendChild(renderFooter());

  observeReveals();

  if (location.hash === "#browse") {
    requestAnimationFrame(() => document.getElementById("browse")?.scrollIntoView());
  }
}

function filteredGames() {
  let list = GAMES.slice();
  if (currentCat !== "all") list = list.filter((g) => g.category === currentCat);
  if (currentQuery) list = list.filter((g) => g.title.toLowerCase().includes(currentQuery) || g.category.includes(currentQuery));
  list.sort((a, b) => b.plays - a.plays);
  return list;
}

function gridEl(games) {
  const grid = document.createElement("div");
  grid.className = "grid";
  if (!games.length) {
    grid.innerHTML = `<div class="empty"><div class="big">🕹️</div>No games here yet — try another category or search.</div>`;
    return grid;
  }
  for (const g of games) grid.appendChild(cardEl(g));
  return grid;
}

function cardEl(g) {
  const a = document.createElement("a");
  a.className = "card reveal";
  a.href = "#/play/" + g.id;
  const best = hs.get(g.id);
  const top = g.plays > 800000;
  a.innerHTML = `
    <div class="card-cover">
      ${g.isNew ? '<span class="card-badge badge-new">New</span>' : top ? '<span class="card-badge badge-top">Top</span>' : ""}
      ${best > 0 ? `<span class="card-hs">★ ${fmtScore(best)}</span>` : ""}
      <canvas></canvas>
      <div class="play-glass"><div class="pg">▶</div></div>
    </div>
    <div class="card-body">
      <div class="card-title">${g.title}</div>
      <div class="card-meta">
        <span class="cat">${CAT_LABELS[g.category]}</span>
        <span class="plays"><span class="star">★</span> ${fmtPlays(g.plays)} plays</span>
      </div>
    </div>`;
  const canvas = a.querySelector("canvas");
  Covers.draw(g.id, canvas);
  a.addEventListener("click", () => sfx.click());
  return a;
}

function renderFooter() {
  const f = document.createElement("footer");
  f.className = "site-footer";
  const byCat = (c) => GAMES.filter((g) => g.category === c);
  f.innerHTML = `
    <div class="footer-grid">
      <div>
        <h4>agame⁺</h4>
        <p style="max-width:36ch">A free browser arcade built from scratch — ${GAMES.length} original implementations, zero downloads, zero trackers. High scores live in your browser, not in someone's database.</p>
      </div>
      ${["arcade", "puzzle", "action", "reflex", "strategy"]
        .map(
          (c) => `
      <div>
        <h4>${CAT_LABELS[c]}</h4>
        <ul>${byCat(c).map((g) => `<li><a href="#/play/${g.id}">${g.title}</a></li>`).join("")}</ul>
      </div>`
        )
        .join("")}
    </div>
    <div class="footer-bottom">
      <span>© 2026 agame⁺ — a fan-made demo portal. Not affiliated with any existing “agame” site.</span>
      <span style="margin-left:auto">Built with vanilla JS + canvas · no frameworks, no build step</span>
    </div>`;
  return f;
}

/* ============================================================
   Game page
   ============================================================ */
function renderGame(id) {
  if (heroAnim) { heroAnim(); heroAnim = null; }
  if (shell) { shell.destroy(); shell = null; }
  app.innerHTML = "";
  renderHeader();

  const reg = byId.get(id);
  if (!reg) {
    app.innerHTML += `<div class="page" style="padding-top:80px;text-align:center;color:var(--muted)">
      <div style="font-size:52px"></div>
      <h2 style="font-family:var(--font-head);margin:12px 0">Game not found</h2>
      <p>That one slipped off the grid.</p>
      <p style="margin-top:16px"><a class="btn btn-primary" href="#/">← Back to all games</a></p>
    </div>`;
    return;
  }

  const root = document.createElement("div");
  root.className = "player-root";
  app.appendChild(root);

  shell = new AG.Shell(reg, root);
  reg.mount(shell);
  document.title = reg.title + " — AGAME+";
}

/* ============================================================
   Router + misc
   ============================================================ */
function route() {
  const h = location.hash || "#/";
  const m = h.match(/^#\/play\/([a-z0-9-]+)/i);
  if (m) renderGame(m[1]);
  else renderHome();
  window.scrollTo(0, 0);
}

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  },
  { threshold: 0.08 }
);
function observeReveals() {
  document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
if (document.readyState !== "loading") route();
