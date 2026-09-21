/* AGAME+ — Chroma (find the odd one out) */
(() => {
  "use strict";
  const { sfx, rand } = AG;

  const ROUNDS = 10;

  AG.register({
    id: "chroma",
    title: "Chroma",
    emoji: "🎨",
    category: "puzzle",
    tagline: "16 tiles, one fake. The difference gets tinier every round. Trust your eyes.",
    description:
      "A colour-hunter with a shrinking timer and a vanishing delta. Streaks multiply your score — break the streak and back to ×1 you go.",
    controls: [["click / tap", "the odd tile"]],
    isNew: true,
    mount(shell) {
      let round, timeLeft, roundLimit, streak, over, running, oddIdx, hue, sat, baseL, delta, dom, gridEl;

      dom = document.createElement("div");
      dom.className = "dom-game";
      shell.frame.appendChild(dom);

      function reset() {
        round = 0;
        timeLeft = 0;
        streak = 0;
        over = false;
        running = true;
        dom.innerHTML = `
          <div class="dg-inner">
            <div>
              <div class="dg-top" style="justify-content:center">
                <span class="dg-chip">Round <b id="rd">1</b>/${ROUNDS}</span>
                <span class="dg-chip">⏱ <b id="tm">4.0</b>s</span>
                <span class="dg-chip">Streak <b id="sk">×1</b></span>
              </div>
              <div class="chroma-grid" id="grid"></div>
            </div>
          </div>`;
        gridEl = dom.querySelector("#grid");
        buildRound();
        shell.setScore(0, { bump: false });
      }

      const buildRound = () => {
        if (shell.destroyed) return;
        round++;
        if (round > ROUNDS) {
          over = true;
          running = false;
          const score = shell.score;
          setTimeout(() => shell.gameOver(score, { emoji: "🎨", lines: [score >= 1200 ? "Eagle eyes confirmed." : "Your color sense is sharpening."] }), 400);
          return;
        }
        roundLimit = Math.max(1.6, 4.0 - (round - 1) * 0.2);
        timeLeft = roundLimit;
        hue = Math.floor(rand(0, 360));
        sat = Math.floor(rand(45, 65));
        baseL = Math.floor(rand(38, 52));
        delta = Math.min(16, 7 + (round - 1) * 0.9) * (Math.random() < 0.5 ? 1 : -1);
        oddIdx = Math.floor(rand(0, 16));
        gridEl.innerHTML = "";
        for (let i = 0; i < 16; i++) {
          const t = document.createElement("div");
          t.className = "chroma-tile";
          const l = i === oddIdx ? Math.min(80, Math.max(8, baseL + delta)) : baseL;
          t.style.background = `hsl(${hue} ${sat}% ${l}%)`;
          t.dataset.i = i;
          t.addEventListener("click", () => pick(i, t));
          gridEl.appendChild(t);
        }
        dom.querySelector("#rd").textContent = round;
      };

      const pick = (i, el) => {
        if (!running || over) return;
        if (i === oddIdx) {
          streak++;
          const mult = Math.min(streak, 4);
          const pts = 100 * mult;
          shell.setScore(shell.score + pts);
          sfx.score(streak);
          setTimeout(() => { if (running && !shell.destroyed) buildRound(); }, 220);
        } else {
          streak = 0;
          sfx.hit();
          el.classList.add("wrong");
          setTimeout(() => el.classList.remove("wrong"), 320);
          dom.querySelector("#sk").textContent = "×1";
        }
      };

      shell._gameStart = () => reset();

      shell._gameUpdate = (dt) => {
        if (!running || over) return;
        timeLeft -= dt;
        if (timeLeft <= 0) {
          streak = 0;
          dom.querySelector("#sk").textContent = "×1";
          sfx.over();
          buildRound();
          return;
        }
        dom.querySelector("#tm").textContent = timeLeft.toFixed(1);
        dom.querySelector("#sk").textContent = "×" + Math.min(Math.max(streak, 1), 4);
      };
      shell._gameDraw = () => {};

      shell.startOverlay();
      reset();
    },
  });
})();
