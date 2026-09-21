/* ============================================================
   AGAME+ — common engine
   storage · sfx · game shell · registry
   ============================================================ */

const AG = (() => {
  "use strict";

  /* ---------------- storage ---------------- */
  const store = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem("agame." + key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("agame." + key, JSON.stringify(value)); } catch {}
    },
  };

  const hs = {
    get(id) { return store.get("hs." + id, 0); },
    best(id, score) {
      const prev = hs.get(id);
      if (score > prev) { store.set("hs." + id, Math.round(score)); return { improved: true, prev, score: Math.round(score) }; }
      return { improved: false, prev, score: Math.round(score) };
    },
  };

  const recent = {
    push(id) {
      const list = store.get("recent", []).filter((x) => x !== id);
      list.unshift(id);
      store.set("recent", list.slice(0, 8));
    },
    all() { return store.get("recent", []); },
  };

  /* ---------------- deterministic "popularity" ---------------- */
  function seededPlays(id) {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    const n = 24000 + (Math.abs(h) % 890000);
    return n;
  }
  function fmtPlays(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  /* ---------------- sound (WebAudio synth, no assets) ---------------- */
  let actx = null;
  let muted = store.get("muted", false);

  function ctx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }

  function tone({ freq = 440, type = "sine", dur = 0.12, vol = 0.18, slide = 0, delay = 0 }) {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.25, vol = 0.2, delay = 0, low = 400 } = {}) {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = low;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t0);
  }

  const sfx = {
    get muted() { return muted; },
    setMuted(m) { muted = m; store.set("muted", m); },
    toggle() { sfx.setMuted(!muted); return muted; },
    click() { tone({ freq: 340, type: "triangle", dur: 0.06, vol: 0.12 }); },
    hover() { tone({ freq: 240, type: "sine", dur: 0.04, vol: 0.05 }); },
    move() { tone({ freq: 220, type: "square", dur: 0.035, vol: 0.06 }); },
    turn() { tone({ freq: 300, type: "triangle", dur: 0.07, vol: 0.1, slide: 120 }); },
    score(n = 1) {
      const base = 520 + Math.min(10, n) * 40;
      tone({ freq: base, type: "square", dur: 0.07, vol: 0.1 });
      tone({ freq: base * 1.5, type: "square", dur: 0.09, vol: 0.09, delay: 0.055 });
    },
    eat() { tone({ freq: 660, type: "sine", dur: 0.08, vol: 0.16, slide: 220 }); },
    hit() { tone({ freq: 190, type: "square", dur: 0.06, vol: 0.12, slide: -60 }); },
    drop() { tone({ freq: 140, type: "triangle", dur: 0.1, vol: 0.16, slide: -60 }); },
    line() { [440, 587, 740, 988].forEach((f, i) => tone({ freq: f, type: "square", dur: 0.1, vol: 0.12, delay: i * 0.055 })); },
    power() { [392, 523, 659, 784].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.09, vol: 0.13, delay: i * 0.05 })); },
    boom() { noise({ dur: 0.3, vol: 0.3, low: 700 }); tone({ freq: 90, type: "sine", dur: 0.25, vol: 0.25, slide: -50 }); },
    over() { [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.16, vol: 0.16, delay: i * 0.13 })); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.18, vol: 0.15, delay: i * 0.09 })); },
    tick() { tone({ freq: 900, type: "sine", dur: 0.03, vol: 0.07 }); },
    whack() { tone({ freq: 160, type: "square", dur: 0.07, vol: 0.2, slide: -80 }); noise({ dur: 0.06, vol: 0.12, low: 900 }); },
    flip() { tone({ freq: 500, type: "sine", dur: 0.07, vol: 0.1, slide: 240 }); },
    pad(i) { const f = [330, 392, 494, 587][i % 4]; tone({ freq: f, type: "triangle", dur: 0.28, vol: 0.22 }); },
    mine() { noise({ dur: 0.5, vol: 0.35, low: 300 }); tone({ freq: 70, type: "sawtooth", dur: 0.4, vol: 0.2, slide: -40 }); },
    flag() { tone({ freq: 700, type: "square", dur: 0.05, vol: 0.09 }); },
    launch() { tone({ freq: 320, type: "sawtooth", dur: 0.18, vol: 0.12, slide: 500 }); },
  };

  /* ---------------- misc utils ---------------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const fmtScore = (n) => Math.round(n).toLocaleString("en-US");

  function toast(msg, ms = 2200) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), ms);
  }

  const isTouch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

  /* ============================================================
     Shell — the player-page framework every game mounts into
     ============================================================ */
  class Shell {
    constructor(reg, root) {
      this.reg = reg;
      this.root = root;
      this.score = 0;
      this.best = hs.get(reg.id);
      this.running = false;
      this.paused = false;
      this.destroyed = false;
      this.keys = new Set();
      this._raf = 0;
      this._listeners = [];
      this.particles = [];
      this.popups = [];
      this._buildDOM();
      this._bindGlobal();
    }

    /* ---------- DOM ---------- */
    _buildDOM() {
      const r = this.reg;
      this.root.innerHTML = `
        <div class="player">
          <div class="player-header">
            <button class="icon-btn" data-act="back" title="Back to all games" aria-label="Back">←</button>
            <span class="ph-title">${r.title}</span>
            <span class="ph-cat">${CAT_LABELS[r.category] || r.category}</span>
            <div class="hud">
              <div class="hud-box" id="hud-score"><div class="l">Score</div><div class="v">0</div></div>
              <div class="hud-box best" id="hud-best"><div class="l">Best</div><div class="v">${fmtScore(this.best)}</div></div>
              <button class="icon-btn" data-act="mute" title="Sound (M)" aria-label="Toggle sound">${sfx.muted ? "🔇" : "🔊"}</button>
              <button class="icon-btn" data-act="pause" title="Pause (Esc)" aria-label="Pause">⏸</button>
              <button class="icon-btn" data-act="restart" title="Restart (R)" aria-label="Restart">↻</button>
              <button class="icon-btn" data-act="fs" title="Fullscreen" aria-label="Fullscreen">⛶</button>
            </div>
          </div>
          <div class="player-stage" id="stage">
            <div class="stage-frame" id="frame">
              <canvas class="game-canvas" id="canvas"></canvas>
              <div class="touchpad" id="touchpad"></div>
              <div class="overlay" id="overlay"></div>
            </div>
          </div>
          <div class="player-info">
            <div class="pi-desc">${r.description}</div>
            <div class="pi-keys">${r.controls.map(([k, l]) => `<span class="key-chip"><kbd>${k}</kbd> ${l}</span>`).join("")}</div>
          </div>
        </div>`;

      this.stage = this.root.querySelector("#stage");
      this.frame = this.root.querySelector("#frame");
      this.canvas = this.root.querySelector("#canvas");
      this.ctx = this.canvas.getContext("2d");
      this.overlayEl = this.root.querySelector("#overlay");
      this.touchpadEl = this.root.querySelector("#touchpad");
      this.scoreEl = this.root.querySelector("#hud-score .v");
      this.bestEl = this.root.querySelector("#hud-best .v");

      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this.frame);
      this.resize();
    }

    resize() {
      const rect = this.frame.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = rect.width;
      this.h = rect.height;
      this.dpr = dpr;
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this._gameResize) this._gameResize();
    }

    /* ---------- input plumbing ---------- */
    on(type, fn, opts) {
      const target = type.startsWith("key") ? window : this.frame;
      target.addEventListener(type, fn, opts);
      this._listeners.push([target, type, fn, opts]);
    }

    _bindGlobal() {
      const onKey = (e) => {
        if (this.destroyed) return;
        const k = e.key === " " ? "space" : e.key.toLowerCase();
        const blocked = this._blockKeys && this._blockKeys.has(k);
        if (e.type === "keydown") {
          this.keys.add(k);
          if (this.running && !this.paused) {
            if (k === "escape" || (k === "p" && !blocked)) { this.pause(); e.preventDefault(); return; }
            if (k === "m" && !blocked) { this._setMuteIcon(sfx.toggle()); return; }
            if (k === "r" && !blocked) { this.restart(); return; }
            if (["arrowup", "arrowdown", "arrowleft", "arrowright", "space"].includes(k) && this._eatsKeys) e.preventDefault();
          } else if (k === "enter" && !this.running) {
            this.start();
          }
          if (this._gameKey) this._gameKey("down", k, e);
        } else {
          this.keys.delete(k);
          if (this._gameKey) this._gameKey("up", k, e);
        }
      };
      const onVis = () => {
        if (document.hidden && this.running && !this.paused) this.pause();
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      document.addEventListener("visibilitychange", onVis);
      this._listeners.push([window, "keydown", onKey], [window, "keyup", onKey], [document, "visibilitychange", onVis]);

      this.frame.addEventListener("click", (e) => {
        const b = e.target.closest("[data-act]");
        if (!b) return;
        const act = b.dataset.act;
        sfx.click();
        if (act === "back") location.hash = "#/";
        if (act === "mute") this._setMuteIcon(sfx.toggle());
        if (act === "pause") this.paused ? this.resume() : this.pause();
        if (act === "restart") this.restart();
        if (act === "fs") {
          const el = this.frame;
          if (document.fullscreenElement) document.exitFullscreen();
          else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        }
      });
    }

    _setMuteIcon(m) {
      const b = this.root.querySelector('[data-act="mute"]');
      if (b) b.textContent = m ? "🔇" : "🔊";
    }

    /* ---------- HUD ---------- */
    setScore(n, { bump = true } = {}) {
      this.score = n;
      this.scoreEl.textContent = fmtScore(n);
      if (bump) {
        this.scoreEl.classList.remove("bump");
        void this.scoreEl.offsetWidth;
        this.scoreEl.classList.add("bump");
      }
    }

    /* ---------- lifecycle ---------- */
    start() {
      if (this.destroyed) return;
      sfx.click();
      this.score = 0;
      this.setScore(0, { bump: false });
      this.best = hs.get(this.reg.id);
      this.bestEl.textContent = fmtScore(this.best);
      this.overlayEl.classList.add("hidden");
      this.paused = false;
      this.running = true;
      this.particles = [];
      this.popups = [];
      if (this._gameStart) this._gameStart();
      this._loop();
    }

    restart() {
      if (!this.running && this.destroyed) return;
      this.start();
    }

    pause() {
      if (!this.running || this.paused || this.destroyed) return;
      this.paused = true;
      this._showOverlay({
        emoji: "⏸️",
        title: "Paused",
        sub: "Take a breath. Your score is safe.",
        primary: { label: "Resume", act: () => this.resume() },
        secondary: { label: "Restart", act: () => this.start() },
      });
    }

    resume() {
      if (!this.paused) return;
      this.paused = false;
      this.overlayEl.classList.add("hidden");
      this._loop();
    }

    gameOver(score, { win = false, emoji, lines = [] } = {}) {
      if (this.destroyed) return;
      this.running = false;
      const res = hs.best(this.reg.id, score);
      this.best = hs.get(this.reg.id);
      this.bestEl.textContent = fmtScore(this.best);
      win ? sfx.win() : sfx.over();
      recent.push(this.reg.id);
      this._showOverlay({
        emoji: win ? (emoji || "🏆") : (emoji || "💥"),
        title: win ? "You win!" : "Game over",
        sub: null,
        scoreBox: true,
        score,
        best: this.best,
        newBest: res.improved,
        lines,
        primary: { label: win ? "Play again" : "Try again", act: () => this.start() },
        secondary: { label: "All games", act: () => (location.hash = "#/") },
      });
    }

    _showOverlay(o) {
      const controls = this.reg.controls.map(([k, l]) => `<span class="key-chip"><kbd>${k}</kbd> ${l}</span>`).join("");
      this.overlayEl.innerHTML = `
        <div class="overlay-card">
          ${o.emoji ? `<div class="ov-emoji">${o.emoji}</div>` : ""}
          <h2>${o.title}</h2>
          ${o.sub ? `<div class="ov-sub">${o.sub}</div>` : ""}
          ${o.scoreBox ? `
          <div class="ov-score">
            <div class="box"><div class="l">Score</div><div class="v">${fmtScore(o.score)}</div></div>
            <div class="box best"><div class="l">Best</div><div class="v">${fmtScore(o.best)}</div>
              ${o.newBest ? `<span class="new-best">NEW BEST</span>` : ""}
            </div>
          </div>` : ""}
          ${(o.lines || []).map((l) => `<div class="ov-sub" style="margin-bottom:6px">${l}</div>`).join("")}
          ${o.controls !== false ? `<div class="ov-controls">${controls}</div>` : ""}
          <div class="ov-actions">
            <button class="btn btn-primary" data-ov="primary">${o.primary.label}</button>
            ${o.secondary ? `<button class="btn btn-ghost" data-ov="secondary">${o.secondary.label}</button>` : ""}
          </div>
        </div>`;
      this.overlayEl.classList.remove("hidden");
      this.overlayEl.querySelector('[data-ov="primary"]').onclick = o.primary.act;
      if (o.secondary) this.overlayEl.querySelector('[data-ov="secondary"]').onclick = o.secondary.act;
    }

    startOverlay() {
      this.overlayEl.innerHTML = `
        <div class="overlay-card">
          <div class="ov-emoji">${this.reg.emoji}</div>
          <h2>${this.reg.title}</h2>
          <div class="ov-sub">${this.reg.tagline}</div>
          ${this.best > 0 ? `<div class="ov-sub" style="color:var(--amber)">Best score: ${fmtScore(this.best)}</div>` : ""}
          <div class="ov-controls">${this.reg.controls.map(([k, l]) => `<span class="key-chip"><kbd>${k}</kbd> ${l}</span>`).join("")}</div>
          <div class="ov-actions">
            <button class="btn btn-primary" data-ov="primary">▶ Play now</button>
            <button class="btn btn-ghost" data-ov="secondary">All games</button>
          </div>
        </div>`;
      this.overlayEl.classList.remove("hidden");
      this.overlayEl.querySelector('[data-ov="primary"]').onclick = () => this.start();
      this.overlayEl.querySelector('[data-ov="secondary"]').onclick = () => (location.hash = "#/");
    }

    /* ---------- main loop ---------- */
    _loop() {
      cancelAnimationFrame(this._raf);
      let last = performance.now();
      const frame = (now) => {
        if (this.destroyed || !this.running || this.paused) return;
        let dt = (now - last) / 1000;
        last = now;
        dt = Math.min(0.05, dt);
        if (this._gameUpdate) this._gameUpdate(dt, now / 1000);
        this.ctx.clearRect(0, 0, this.w, this.h);
        if (this._gameDraw) this._gameDraw();
        this._drawParticles(dt);
        this._raf = requestAnimationFrame(frame);
      };
      this._raf = requestAnimationFrame(frame);
    }

    /* ---------- fx helpers (canvas games) ---------- */
    burst(x, y, { color = "#22d3ee", count = 14, speed = 190, life = 0.55, size = 3.5 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(0.25, 1) * speed;
        this.particles.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: rand(life * 0.5, life),
          max: life,
          size: rand(size * 0.5, size * 1.3),
          color,
        });
      }
    }

    popup(x, y, text, color = "#e8ecf8") {
      this.popups.push({ x, y, text, color, life: 0.9, max: 0.9 });
    }

    _drawParticles(dt) {
      const c = this.ctx;
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) { this.particles.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 320 * dt;
        p.vx *= 0.985;
        c.globalAlpha = Math.max(0, p.life / p.max);
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (p.life / p.max), 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const p = this.popups[i];
        p.life -= dt;
        if (p.life <= 0) { this.popups.splice(i, 1); continue; }
        const t = 1 - p.life / p.max;
        c.globalAlpha = Math.min(1, p.life / (p.max * 0.5));
        c.font = `700 ${16 + t * 4}px "Chakra Petch", sans-serif`;
        c.textAlign = "center";
        c.fillStyle = p.color;
        c.fillText(p.text, p.x, p.y - t * 42);
      }
      c.globalAlpha = 1;
    }

    /* ---------- touch pad (for keyboard games on touch) ---------- */
    touchpad(buttons) {
      // buttons: array of rows; each button: { label, on }
      this.touchpadEl.innerHTML = "";
      for (const row of buttons) {
        const r = document.createElement("div");
        r.className = "row";
        for (const b of row) {
          const btn = document.createElement("button");
          btn.textContent = b.label;
          btn.addEventListener("pointerdown", (e) => { e.preventDefault(); b.on(); });
          r.appendChild(btn);
        }
        this.touchpadEl.appendChild(r);
      }
      this.touchpadEl.classList.add("show");
    }

    /* ---------- destroy ---------- */
    destroy() {
      this.destroyed = true;
      this.running = false;
      cancelAnimationFrame(this._raf);
      for (const [t, type, fn, opts] of this._listeners) t.removeEventListener(type, fn, opts);
      this._listeners = [];
      if (this._ro) this._ro.disconnect();
      this.root.innerHTML = "";
    }
  }

  /* ============================================================
     Registry
     ============================================================ */
  const GAMES = [];
  const byId = new Map();

  function register(reg) {
    reg.plays = seededPlays(reg.id);
    GAMES.push(reg);
    byId.set(reg.id, reg);
  }

  const CAT_LABELS = {
    arcade: "Arcade",
    action: "Action",
    puzzle: "Puzzle",
    reflex: "Reflex",
    strategy: "Strategy",
  };

  const CAT_EMOJI = { arcade: "🕹️", action: "⚔️", puzzle: "🧩", reflex: "⚡", strategy: "🧠" };

  return { store, hs, recent, sfx, Shell, register, GAMES, byId, CAT_LABELS, CAT_EMOJI, clamp, lerp, rand, randi, choice, shuffle, fmtScore, fmtPlays, seededPlays, toast, isTouch };
})();

window.AG = AG;
window.CAT_LABELS = AG.CAT_LABELS;
