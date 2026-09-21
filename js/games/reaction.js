/* AGAME+ — Reaction Test */
(() => {
  "use strict";
  const { sfx, rand } = AG;

  const ROUNDS = 5;

  AG.register({
    id: "reaction",
    title: "Reaction Test",
    emoji: "⚡",
    category: "reflex",
    tagline: "Five rounds. Wait for green. Tap. We'll tell you how slow you are (politely).",
    description:
      "The honest benchmark. Tap or hit space the instant the box turns green. Tap too early and the round restarts. Under 250ms is sharp; under 200ms is suspicious.",
    controls: [["tap / space", "when it turns green"]],
    isNew: false,
    mount(shell) {
      let state, waitT, goAt, results, round, dom, zone;

      dom = document.createElement("div");
      dom.className = "dom-game";
      shell.frame.appendChild(dom);

      function reset() {
        state = "idle";
        results = [];
        round = 0;
        dom.innerHTML = `
          <div class="dg-inner">
            <div>
              <div class="react-zone idle" id="zone">
                <div>
                  <div class="rz-main" id="zm">Reaction Test</div>
                  <div class="rz-sub" id="zs">Tap anywhere to start round 1 of ${ROUNDS}</div>
                </div>
              </div>
              <div class="react-rounds" id="rr">
                ${Array.from({ length: ROUNDS }, (_, i) => `<div class="rr" data-i="${i}">${i + 1}</div>`).join("")}
              </div>
            </div>
          </div>`;
        zone = dom.querySelector("#zone");
        zone.addEventListener("pointerdown", tap);
        shell.setScore(0, { bump: false });
      }

      const setZone = (cls, main, sub) => {
        if (!zone || !zone.isConnected) return;
        zone.className = "react-zone " + cls;
        dom.querySelector("#zm").textContent = main;
        dom.querySelector("#zs").textContent = sub;
      };

      const startRound = () => {
        if (shell.destroyed) return;
        state = "wait";
        waitT = rand(1500, 3800);
        setZone("wait", "Wait for green…", "Don't tap yet — the tap must come AFTER green");
      };

      const endRound = (ms) => {
        state = "done";
        results.push(ms);
        round++;
        const el = dom.querySelector(`.rr[data-i="${round - 1}"]`);
        if (el) { el.textContent = ms + "ms"; el.classList.add("done"); }
        setZone("idle", `${ms} ms`, ms < 220 ? "Blazing. Are you a robot?" : ms < 300 ? "Sharp." : "Human-ish. Round " + (round + 1) + "…");
        sfx.score(2);
        if (round >= ROUNDS) {
          const best = Math.min(...results);
          const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
          const score = Math.max(0, Math.round(1200 - best));
          setTimeout(() => shell.gameOver(score, { emoji: "⚡", lines: [`Fastest: ${best} ms`, `Average: ${avg} ms`] }), 800);
        } else {
          setTimeout(() => { if (state === "done") startRound(); }, 1100);
        }
      };

      const tap = () => {
        if (state === "idle") {
          if (results.length) { round = 0; results = []; startRound(); return; }
          startRound();
        } else if (state === "wait") {
          state = "early";
          sfx.over();
          setZone("early", "Too soon!", "The trap worked. Round restarts — wait for green.");
          setTimeout(startRound, 900);
        } else if (state === "go") {
          const ms = Math.round(performance.now() - goAt);
          endRound(ms);
        }
      };

      shell._gameKey = (type, k) => {
        if (type !== "down") return;
        if (k === "space" || k === "enter" || k === "arrowup") { tap(); }
      };

      shell._gameStart = () => reset();

      shell._gameUpdate = (dt) => {
        if (state !== "wait") return;
        waitT -= dt * 1000;
        if (waitT <= 0) {
          state = "go";
          goAt = performance.now();
          setZone("go", "TAP!", "");
          sfx.tick();
        }
      };
      shell._gameDraw = () => {};

      shell.startOverlay();
      reset();
    },
  });
})();
