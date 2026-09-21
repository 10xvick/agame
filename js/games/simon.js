/* AGAME+ — Simon Says */
(() => {
  "use strict";
  const { sfx, randi } = AG;

  const PADS = [
    { bg: "#f87171", name: "red" },
    { bg: "#a3e635", name: "green" },
    { bg: "#fbbf24", name: "yellow" },
    { bg: "#22d3ee", name: "blue" },
  ];

  AG.register({
    id: "simon",
    title: "Simon Says",
    emoji: "",
    category: "reflex",
    tagline: "Watch the pattern. Repeat it. Every round it gets one step longer.",
    description:
      "The memory-sequencer that tests your nerves and your memory at once. Listen to the tones as well as the colors — they're a cheat code.",
    controls: [["click / tap", "press pads in order"]],
    isNew: false,
    mount(shell) {
      let seq, pos, state, over, dom;

      dom = document.createElement("div");
      dom.className = "dom-game";
      shell.frame.appendChild(dom);

      const build = () => {
        dom.innerHTML = `
          <div class="dg-inner">
            <div class="simon-status" id="st">Get ready…</div>
            <div class="simon-grid">
              ${PADS.map((p, i) => `<button class="simon-pad" data-i="${i}" style="background:${p.bg}"></button>`).join("")}
            </div>
          </div>`;
        dom.querySelectorAll(".simon-pad").forEach((b) => {
          b.addEventListener("click", () => press(+b.dataset.i));
        });
      };

      const lit = (i, on) => {
        const b = dom.querySelector(`.simon-pad[data-i="${i}"]`);
        if (b) b.classList.toggle("lit", on);
        if (on) sfx.pad(i);
      };

      const status = (t) => {
        const el = dom.querySelector("#st");
        if (el) el.textContent = t;
      };

      function reset() {
        seq = [];
        pos = 0;
        state = "idle";
        over = false;
        shell.setScore(0, { bump: false });
        status("Get ready…");
        setTimeout(nextRound, 800);
      }

      const nextRound = () => {
        if (over || shell.destroyed) return;
        seq.push(randi(0, 3));
        pos = 0;
        state = "play";
        status(`Round ${seq.length} — watch…`);
        let i = 0;
        const play = () => {
          if (over || shell.destroyed) return;
          if (i < seq.length) {
            const pad = seq[i];
            lit(pad, true);
            setTimeout(() => lit(pad, false), 320);
            i++;
            setTimeout(play, 620);
          } else {
            state = "input";
            status(`Round ${seq.length} — your turn`);
          }
        };
        setTimeout(play, 700);
      };

      const press = (i) => {
        if (state !== "input" || over) return;
        lit(i, true);
        setTimeout(() => lit(i, false), 200);
        if (i === seq[pos]) {
          pos++;
          if (pos === seq.length) {
            state = "idle";
            shell.setScore(seq.length);
            sfx.score(seq.length);
            status("Nice! Prepare…");
            setTimeout(nextRound, 900);
          }
        } else {
          over = true;
          state = "dead";
          sfx.over();
          status("Wrong pad!");
          const score = Math.max(0, seq.length - 1);
          setTimeout(() => shell.gameOver(score, { emoji: "🎵", lines: [`You reached round ${seq.length}`] }), 600);
        }
      };

      shell._gameKey = (type, k) => {
        if (type !== "down") return;
        const map = { "1": 0, "2": 1, "3": 2, "4": 3 };
        if (k in map) press(map[k]);
      };

      shell._gameStart = () => {
        build();
        reset();
      };
      shell._gameUpdate = () => {};
      shell._gameDraw = () => {};

      shell.startOverlay();
      build();
    },
  });
})();
