/* AGAME+ — Whack-a-Mole */
(() => {
  "use strict";
  const { sfx, rand, randi } = AG;

  const DURATION = 30;

  AG.register({
    id: "whack",
    title: "Whack-a-Mole",
    emoji: "🔨",
    category: "action",
    tagline: "30 seconds. Moles up, mallet down. Gold moles pay double — bombs pay YOU.",
    description:
      "A fast twitch-reflex banger. Hit 🐹 for 10, 🌟 for 25, and pray the 💣 isn't what you're aiming for (-20). They speed up as the clock runs down.",
    controls: [["click / tap", "whack"]],
    isNew: false,
    mount(shell) {
      let holes, score, timeLeft, over, spawnT, spawnEvery, upTime, dom, gridEl, running;

      dom = document.createElement("div");
      dom.className = "dom-game";
      shell.frame.appendChild(dom);

      function reset() {
        score = 0;
        timeLeft = DURATION;
        over = false;
        running = true;
        spawnT = 0.4;
        spawnEvery = 0.85;
        upTime = 1.0;
        dom.innerHTML = `
          <div class="dg-inner">
            <div>
              <div class="dg-top" style="justify-content:center">
                <span class="dg-chip">⏱ <b id="tm">${DURATION}</b>s</span>
              </div>
              <div class="whack-grid" id="grid">
                ${Array.from({ length: 9 }, (_, i) => `
                  <div class="whack-hole" data-i="${i}">
                    <div class="whack-mole" data-i="${i}"></div>
                  </div>`).join("")}
              </div>
            </div>
          </div>`;
        gridEl = dom.querySelector("#grid");
        holes = [...Array(9)].map((_, i) => ({ i, up: false, type: null, t: 0, hit: false }));
        gridEl.querySelectorAll(".whack-hole").forEach((h) => {
          h.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            whack(+h.dataset.i);
          });
        });
        shell.setScore(0, { bump: false });
      }

      const moleEl = (i) => dom.querySelector(`.whack-mole[data-i="${i}"]`);
      const holeEl = (i) => dom.querySelector(`.whack-hole[data-i="${i}"]`);

      const showPop = (i, text, color) => {
        const h = holeEl(i);
        const p = document.createElement("div");
        p.className = "whack-pop";
        p.style.color = color;
        p.textContent = text;
        h.appendChild(p);
        setTimeout(() => p.remove(), 700);
      };

      const spawn = () => {
        const free = holes.filter((h) => !h.up);
        if (!free.length) return;
        const h = free[randi(0, free.length - 1)];
        const r = Math.random();
        h.type = r < 0.72 ? "mole" : r < 0.88 ? "gold" : "bomb";
        h.up = true;
        h.hit = false;
        h.t = upTime * rand(0.8, 1.15);
        const m = moleEl(h.i);
        m.textContent = h.type === "mole" ? "🐹" : h.type === "gold" ? "🌟" : "💣";
        holeEl(h.i).classList.add("up");
      };

      const whack = (i) => {
        if (over) return;
        const h = holes[i];
        const el = holeEl(i);
        if (!h.up) {
          el.classList.remove("hit");
          void el.offsetWidth;
          el.classList.add("hit");
          setTimeout(() => el.classList.remove("hit"), 120);
          return;
        }
        h.up = false;
        h.hit = true;
        el.classList.remove("up");
        el.classList.add("hit");
        const pts = h.type === "mole" ? 10 : h.type === "gold" ? 25 : -20;
        score = Math.max(0, score + pts);
        shell.setScore(score);
        showPop(i, (pts > 0 ? "+" : "") + pts, pts > 0 ? "#a3e635" : "#f87171");
        if (h.type === "bomb") { sfx.boom(); }
        else sfx.whack();
      };

      shell._gameStart = () => reset();

      shell._gameUpdate = (dt) => {
        if (!running || over) return;
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          over = true;
          running = false;
          shell.gameOver(score, {
            emoji: "🔨",
            lines: [score >= 200 ? "Whack champion energy." : "The moles are laughing."],
          });
          return;
        }
        const t = DURATION - timeLeft;
        spawnEvery = Math.max(0.42, 0.85 - t * 0.014);
        upTime = Math.max(0.62, 1.0 - t * 0.012);

        spawnT -= dt;
        if (spawnT <= 0) {
          spawn();
          spawnT = spawnEvery * rand(0.75, 1.25);
        }
        for (const h of holes) {
          if (!h.up) continue;
          h.t -= dt;
          if (h.t <= 0) {
            h.up = false;
            holeEl(h.i).classList.remove("up");
          }
        }
        const tm = dom.querySelector("#tm");
        if (tm) tm.textContent = Math.ceil(timeLeft);
      };
      shell._gameDraw = () => {};

      shell.startOverlay();
      reset();
    },
  });
})();
