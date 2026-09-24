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
  h.className = "site-header game-hud";
  h.innerHTML = `
    <div class="hud-level" aria-label="Player level 23">
      <span class="level-medal">23</span>
      <div class="level-copy">
        <div class="level-line"><strong>Cozy level</strong><span>3,838 EXP</span></div>
        <div class="exp-track"><span></span></div>
      </div>
    </div>
    <a class="logo" href="#/" aria-label="Agame home">
      <span class="logo-mark">A+</span>
      <span>agame<span class="plus">⁺</span></span>
    </a>
    <div class="header-search">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="search" type="search" placeholder="Find a game…" autocomplete="off" aria-label="Find a game" />
    </div>
    <div class="header-right">
      <div class="coin-counter" aria-label="8,017 coins"><span class="coin-icon">●</span><strong>8,017</strong><small>＋</small></div>
      <button class="icon-btn" id="sound" title="Toggle sound (M)" aria-label="Toggle sound">${sfx.muted ? "🔇" : "🔊"}</button>
      <button class="icon-btn settings-btn" id="settings" title="Cozy settings" aria-label="Cozy settings">⚙</button>
    </div>`;
  app.appendChild(h);

  h.querySelector("#sound").addEventListener("click", () => {
    const m = sfx.toggle();
    h.querySelector("#sound").textContent = m ? "🔇" : "🔊";
  });
  h.querySelector("#settings").addEventListener("click", () => toast("Everything is saved right here on your device ✦"));

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
  let W = 0, H = 0, dpr = 1, t = 0, raf = 0;
  let ox = 0, oy = 0, unit = 1;
  const pointer = { x: 0.72, y: 0.34, active: false };
  const sparks = [];
  const flecks = Array.from({ length: 54 }, () => ({
    x: Math.random() * 640,
    y: Math.random() * 420,
    r: 0.5 + Math.random() * 1.8,
    a: 0.12 + Math.random() * 0.22,
  }));
  const balloons = [
    { x: 92, y: 104, s: 0.72, hue: "#f6a7b8", phase: 0.3 },
    { x: 548, y: 102, s: 0.58, hue: "#a99af6", phase: 1.9 },
    { x: 585, y: 188, s: 0.38, hue: "#f6c26b", phase: 3.1 },
  ];
  const clouds = [
    { x: 92, y: 78, s: 0.88, speed: 0.8 },
    { x: 470, y: 62, s: 0.65, speed: -0.45 },
  ];

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    unit = Math.min(W / 640, H / 420);
    ox = (W - 640 * unit) / 2;
    oy = (H - 420 * unit) / 2;
  };

  const pointFromEvent = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    pointer.y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    pointer.active = true;
  };
  const onMove = (e) => pointFromEvent(e);
  const onLeave = () => { pointer.active = false; };
  const onDown = (e) => {
    pointFromEvent(e);
    const x = (pointer.x * W - ox) / unit;
    const y = (pointer.y * H - oy) / unit;
    for (let i = 0; i < 20; i++) {
      const a = (Math.PI * 2 * i) / 20 + Math.random() * 0.25;
      sparks.push({ x, y, vx: Math.cos(a) * (35 + Math.random() * 75), vy: Math.sin(a) * (35 + Math.random() * 75), life: 0.7 + Math.random() * 0.45, max: 1.15, hue: ["#f48fb1", "#8bd8c7", "#f7c96b", "#a99af6"][i % 4] });
    }
    sfx.click();
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);

  const cloud = (x, y, s) => {
    g.save();
    g.fillStyle = "rgba(255,255,255,0.72)";
    g.beginPath();
    g.arc(x, y + 7 * s, 19 * s, Math.PI, 0);
    g.arc(x + 21 * s, y - 2 * s, 26 * s, Math.PI, 0);
    g.arc(x + 51 * s, y + 7 * s, 18 * s, Math.PI, 0);
    g.lineTo(x + 69 * s, y + 21 * s);
    g.lineTo(x - 19 * s, y + 21 * s);
    g.closePath();
    g.fill();
    g.restore();
  };

  const flower = (x, y, color, s = 1) => {
    g.strokeStyle = "#6fb89d";
    g.lineWidth = 2 * s;
    g.beginPath(); g.moveTo(x, y + 2 * s); g.lineTo(x, y + 21 * s); g.stroke();
    g.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      g.beginPath(); g.arc(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, 4 * s, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#f7c96b";
    g.beginPath(); g.arc(x, y, 3 * s, 0, Math.PI * 2); g.fill();
  };

  const draw = (now) => {
    t += 0.016;
    g.clearRect(0, 0, W, H);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#fff4dc");
    sky.addColorStop(0.58, "#e9f7ee");
    sky.addColorStop(1, "#c9eadd");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    g.save();
    g.translate(ox, oy);
    g.scale(unit, unit);

    // warm paper-like flecks keep the scene feeling hand painted.
    for (const f of flecks) {
      g.globalAlpha = f.a;
      g.fillStyle = "#fffdf7";
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;

    // sun and drifting clouds
    g.fillStyle = "rgba(248, 194, 107, 0.22)";
    g.beginPath(); g.arc(510, 84, 68 + Math.sin(t * 0.5) * 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f8c66f";
    g.beginPath(); g.arc(510, 84, 34, 0, Math.PI * 2); g.fill();
    for (const c of clouds) cloud(c.x + ((t * c.speed) % 740) - 50, c.y, c.s);
    for (const b of balloons) {
      const bx = b.x + Math.sin(t * 0.55 + b.phase) * 9;
      const by = b.y + Math.cos(t * 0.7 + b.phase) * 5;
      g.strokeStyle = "rgba(111, 126, 122, 0.34)";
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(bx, by + 18 * b.s); g.lineTo(bx - 5 * b.s, by + 74 * b.s); g.stroke();
      g.fillStyle = b.hue;
      g.beginPath(); g.ellipse(bx, by, 15 * b.s, 20 * b.s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.beginPath(); g.ellipse(bx - 5 * b.s, by - 7 * b.s, 4 * b.s, 7 * b.s, -0.4, 0, Math.PI * 2); g.fill();
    }

    // distant rolling hills
    g.fillStyle = "#b9dfc8";
    g.beginPath();
    g.moveTo(0, 238); g.bezierCurveTo(90, 176, 162, 214, 244, 190); g.bezierCurveTo(350, 157, 404, 220, 500, 186); g.bezierCurveTo(560, 166, 603, 183, 640, 165); g.lineTo(640, 420); g.lineTo(0, 420); g.closePath(); g.fill();
    g.fillStyle = "#9fd2b8";
    g.beginPath();
    g.moveTo(0, 292); g.bezierCurveTo(104, 244, 180, 280, 264, 254); g.bezierCurveTo(358, 225, 440, 283, 524, 246); g.bezierCurveTo(576, 225, 610, 247, 640, 232); g.lineTo(640, 420); g.lineTo(0, 420); g.closePath(); g.fill();

    // winding path toward the little arcade house
    g.fillStyle = "#f7e0bd";
    g.beginPath();
    g.moveTo(287, 420); g.bezierCurveTo(300, 363, 320, 320, 340, 290); g.bezierCurveTo(354, 269, 374, 262, 391, 253); g.bezierCurveTo(408, 279, 432, 307, 459, 332); g.bezierCurveTo(492, 365, 530, 392, 568, 420); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.36)";
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(354, 414); g.bezierCurveTo(356, 355, 370, 310, 391, 267); g.stroke();

    // trees
    const tree = (x, y, s, color) => {
      g.fillStyle = "#8b6b62";
      rr(g, x - 6 * s, y + 42 * s, 12 * s, 44 * s, 5 * s); g.fill();
      g.fillStyle = color;
      g.beginPath(); g.arc(x, y + 26 * s, 30 * s, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x - 23 * s, y + 43 * s, 24 * s, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x + 22 * s, y + 43 * s, 25 * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.beginPath(); g.arc(x - 10 * s, y + 16 * s, 7 * s, 0, Math.PI * 2); g.fill();
    };
    tree(88, 236, 0.85, "#70bea0");
    tree(564, 230, 0.72, "#82c7a4");

    // tiny arcade cabin
    g.shadowColor = "rgba(86, 99, 97, 0.24)";
    g.shadowBlur = 22;
    g.shadowOffsetY = 12;
    g.fillStyle = "#fff9ec";
    rr(g, 286, 205, 154, 108, 17); g.fill();
    g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.fillStyle = "#f28fa7";
    g.beginPath(); g.moveTo(270, 220); g.lineTo(363, 151); g.lineTo(456, 220); g.closePath(); g.fill();
    g.fillStyle = "#f8b3be";
    g.beginPath(); g.moveTo(282, 216); g.lineTo(363, 164); g.lineTo(444, 216); g.lineTo(435, 216); g.lineTo(363, 175); g.lineTo(291, 216); g.closePath(); g.fill();
    // window + door
    g.fillStyle = "#a5dfd1";
    rr(g, 311, 233, 48, 39, 10); g.fill();
    g.strokeStyle = "rgba(66, 124, 117, 0.45)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(335, 234); g.lineTo(335, 271); g.moveTo(311, 252); g.lineTo(359, 252); g.stroke();
    g.fillStyle = "#8f7ada";
    rr(g, 379, 234, 36, 79, 11); g.fill();
    g.fillStyle = "#f8c66f";
    g.beginPath(); g.arc(407, 274, 4, 0, Math.PI * 2); g.fill();
    // sign
    g.fillStyle = "#fff2c8";
    rr(g, 320, 187, 86, 25, 10); g.fill();
    g.fillStyle = "#8f7ada";
    g.beginPath(); g.arc(342, 199.5, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f28fa7";
    g.beginPath(); g.moveTo(361, 194); g.lineTo(371, 199.5); g.lineTo(361, 205); g.closePath(); g.fill();
    g.fillStyle = "#77cbb7";
    g.beginPath(); g.arc(386, 199.5, 6, 0, Math.PI * 2); g.fill();

    // little stepping stones and flowers add the cozy details.
    g.fillStyle = "rgba(122, 169, 149, 0.42)";
    [[230, 370, 11], [258, 390, 8], [210, 402, 6], [505, 370, 9]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r * 1.4, r, -0.2, 0, Math.PI * 2); g.fill(); });
    flower(148, 335, "#f28fa7", 0.78); flower(530, 320, "#a99af6", 0.72); flower(186, 389, "#f8c66f", 0.55);

    // friendly floating mascot; it leans toward the pointer without leaving the scene.
    const px = pointer.active ? (pointer.x * 640 - 320) * 0.035 : 0;
    const py = pointer.active ? (pointer.y * 420 - 210) * 0.018 : 0;
    const mx = 500 + px;
    const my = 272 + py + Math.sin(t * 2.2) * 5;
    g.save();
    g.translate(mx, my);
    g.rotate(Math.sin(t * 1.4) * 0.05);
    g.shadowColor = "rgba(92, 127, 115, 0.25)"; g.shadowBlur = 16; g.shadowOffsetY = 8;
    g.fillStyle = "#8bd8c7";
    g.beginPath(); g.ellipse(0, 0, 39, 45, 0, 0, Math.PI * 2); g.fill();
    g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.fillStyle = "#d9f5df";
    g.beginPath(); g.ellipse(-8, 10, 18, 20, -0.15, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#5b9f92"; g.lineWidth = 3; g.lineCap = "round";
    g.beginPath(); g.moveTo(-11, -39); g.quadraticCurveTo(-16, -62, -4, -68); g.stroke();
    g.fillStyle = "#f8c66f"; g.beginPath(); g.arc(-4, -69, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#4e6870";
    g.beginPath(); g.arc(-12, -5, 4, 0, Math.PI * 2); g.arc(13, -5, 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#4e6870"; g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 4, 10, 0.2, Math.PI - 0.2); g.stroke();
    g.restore();

    // floating game pieces echo the canvas games on the shelf.
    const pieces = [
      { x: 190, y: 115, c: "#a99af6", r: 0.2 },
      { x: 232, y: 135, c: "#f8c66f", r: -0.3 },
      { x: 442, y: 126, c: "#8bd8c7", r: 0.35 },
    ];
    pieces.forEach((p, i) => {
      const y = p.y + Math.sin(t * 1.2 + i) * 7;
      g.save(); g.translate(p.x, y); g.rotate(p.r + Math.sin(t + i) * 0.05);
      g.shadowColor = p.c; g.shadowBlur = 12; g.fillStyle = p.c;
      rr(g, -14, -14, 28, 28, 8); g.fill();
      g.shadowColor = "transparent"; g.shadowBlur = 0;
      g.fillStyle = "rgba(255,255,255,0.42)"; rr(g, -8, -8, 16, 5, 2); g.fill();
      g.restore();
    });

    // soft fireflies
    for (let i = 0; i < 7; i++) {
      const fx = 110 + i * 76 + Math.sin(t * (0.6 + i * 0.03) + i) * 10;
      const fy = 170 + Math.cos(t * 0.8 + i * 1.8) * 18;
      g.globalAlpha = 0.35 + Math.sin(t * 2 + i) * 0.18;
      g.fillStyle = i % 2 ? "#f8c66f" : "#f28fa7";
      g.beginPath(); g.arc(fx, fy, 3.3, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.restore();

    // click sparkles are rendered above the scaled scene, so they stay crisp on retina screens.
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life -= 0.016;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      p.x += p.vx * 0.016; p.y += p.vy * 0.016; p.vy += 80 * 0.016;
      g.globalAlpha = Math.max(0, p.life / p.max);
      g.fillStyle = p.hue;
      g.beginPath(); g.arc(ox + p.x * unit, oy + p.y * unit, 2.5 + (1 - p.life) * 2, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  };

  raf = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("pointerdown", onDown);
  };
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
  document.title = "AGAME+ — Cozy game shelf";
  if (shell) { shell.destroy(); shell = null; }
  if (heroAnim) { heroAnim(); heroAnim = null; }
  app.innerHTML = "";
  renderHeader();

  const page = document.createElement("main");
  page.className = "page collection-page";
  const totalPlays = GAMES.reduce((a, g) => a + g.plays, 0);
  const cats = ["all", "arcade", "action", "puzzle", "reflex", "strategy"];
  const catIndex = Math.max(0, cats.indexOf(currentCat));

  const screen = document.createElement("section");
  screen.className = "collection-screen";
  screen.innerHTML = `
    <div class="collection-topline">
      <button class="back-button" id="home-back" aria-label="Back to home">‹ <span>Back</span></button>
      <div class="screen-name"><span class="screen-kicker">YOUR LITTLE ARCADE</span><h1>Game shelf</h1></div>
      <button class="help-button" id="shelf-help" aria-label="About the game shelf">?</button>
    </div>
    <div class="collection-progress">
      <div class="progress-copy"><span>Fresh games</span><strong>${GAMES.length}<small> / ${GAMES.length}</small></strong></div>
      <div class="progress-track"><span style="width:56%"></span></div>
      <div class="progress-foot"><span>Keep exploring</span><b>56%</b></div>
    </div>
    <div class="shelf-intro">
      <div><span class="sticker">✦ PICK A MOOD</span><h2>What sounds fun?</h2><p>${fmtPlays(totalPlays)} happy plays and counting.</p></div>
      <div class="shelf-mascot" aria-hidden="true"><span>✦</span><i></i></div>
    </div>`;
  page.appendChild(screen);

  screen.querySelector("#home-back").addEventListener("click", () => { currentQuery = ""; currentCat = "all"; renderHome(); });
  screen.querySelector("#shelf-help").addEventListener("click", () => toast("Pick a card, press play, and make yourself comfy ✦"));

  const tools = document.createElement("div");
  tools.className = "shelf-tools";
  tools.innerHTML = `
    <div class="mobile-search shelf-search">
      <div class="header-search">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="search-m" type="search" placeholder="Find a game…" autocomplete="off" aria-label="Find a game" />
      </div>
    </div>
    <div class="mood-tabs" aria-label="Game categories"></div>`;
  page.appendChild(tools);
  const tabs = tools.querySelector(".mood-tabs");
  tabs.innerHTML = cats.map((c) => {
    const count = c === "all" ? GAMES.length : GAMES.filter((g) => g.category === c).length;
    const label = c === "all" ? "✦ All" : `${CAT_EMOJI[c]} ${CAT_LABELS[c]}`;
    return `<button class="mood-tab ${c === currentCat ? "active" : ""}" data-cat="${c}">${label}<small>${count}</small></button>`;
  }).join("");
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    currentCat = b.dataset.cat;
    sfx.click();
    renderHome();
  });
  const mobileInput = tools.querySelector("#search-m");
  mobileInput.value = currentQuery;
  mobileInput.addEventListener("input", () => {
    currentQuery = mobileInput.value.trim().toLowerCase();
    renderHome();
  });
  mobileInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const g = findMatch(currentQuery);
      if (g) location.hash = "#/play/" + g.id;
      else toast("No game found for “" + mobileInput.value + "”");
    }
  });

  const browse = document.createElement("section");
  browse.className = "section shelf-section";
  browse.id = "browse";
  browse.style.scrollMarginTop = "96px";
  const list = filteredGames();
  browse.innerHTML = `
    <div class="shelf-section-head"><div><span class="tiny-label">THE PLAYROOM</span><h2>${currentQuery ? `Results for “${currentQuery}”` : currentCat === "all" ? "Little games" : CAT_LABELS[currentCat]}</h2></div><span class="game-count">${list.length} ready to play</span></div>
    <div class="shelf-pager"><button class="pager-arrow" data-dir="-1" aria-label="Previous mood">‹</button><div class="pager-dots">${cats.map((c, i) => `<i class="${i === catIndex ? "active" : ""}"></i>`).join("")}</div><button class="pager-arrow" data-dir="1" aria-label="Next mood">›</button></div>`;
  const grid = gridEl(list);
  grid.classList.add("game-grid");
  browse.appendChild(grid);
  page.appendChild(browse);
  browse.querySelectorAll(".pager-arrow").forEach((button) => button.addEventListener("click", () => {
    const next = (catIndex + Number(button.dataset.dir) + cats.length) % cats.length;
    currentCat = cats[next];
    sfx.click();
    renderHome();
  }));

  app.appendChild(page);
  app.appendChild(renderFooter());

  const nav = document.createElement("nav");
  nav.className = "mobile-nav";
  nav.setAttribute("aria-label", "Main navigation");
  nav.innerHTML = `
    <a class="active" href="#/"><span class="nav-glyph">⌂</span><span>Home</span></a>
    <a href="#browse"><span class="nav-glyph">✦</span><span>Play</span></a>
    <button data-cat="arcade"><span class="nav-glyph">◈</span><span>Arcade</span></button>
    <button data-cat="puzzle"><span class="nav-glyph">◇</span><span>Puzzles</span></button>
    <button id="nav-sound"><span class="nav-glyph">${sfx.muted ? "🔇" : "♫"}</span><span>Sound</span></button>`;
  app.appendChild(nav);
  nav.querySelectorAll("[data-cat]").forEach((button) => button.addEventListener("click", () => {
    currentCat = button.dataset.cat;
    sfx.click();
    renderHome();
    requestAnimationFrame(() => document.getElementById("browse")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }));
  nav.querySelector("#nav-sound").addEventListener("click", () => {
    const muted = sfx.toggle();
    nav.querySelector(".nav-glyph").textContent = muted ? "🔇" : "♫";
    const headerSound = document.querySelector("#sound");
    if (headerSound) headerSound.textContent = muted ? "🔇" : "🔊";
  });

  observeReveals();
  if (location.hash === "#browse") requestAnimationFrame(() => document.getElementById("browse")?.scrollIntoView());
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
