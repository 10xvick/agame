/* AGAME+ — Memory Match */
(() => {
  "use strict";
  const { sfx, shuffle, rand } = AG;

  const EMOJI = ["🐸", "🚀", "🎧", "⚽", "", "🔥", "🍕", "👾"];

  AG.register({
    id: "memory",
    title: "Memory Match",
    emoji: "🃏",
    category: "puzzle",
    tagline: "Eight pairs, forty-eight seconds of brain space. Flip, remember, match.",
    description:
      "The classic concentration game. Fewer moves and a faster clock means a bigger score. Your brain is the only save file.",
    controls: [["click / tap", "flip a card"]],
    isNew: false,
    mount(shell) {
      let deck, first, lock, moves, startT, running, elapsed, over;
      let gridEl;

      const dom = document.createElement("div");
      dom.className = "dom-game";
      shell.frame.appendChild(dom);

      function reset() {
        deck = shuffle(EMOJI.flatMap((e) => [e, e]));
        first = null;
        lock = false;
        moves = 0;
        startT = 0;
        running = false;
        elapsed = 0;
        over = false;
        dom.innerHTML = `
          <div class="dg-inner">
            <div class="dg-top"><span class="dg-chip">Moves <b id="mv">0</b></span><span class="dg-chip">Time <b id="tm">0s</b></span><span class="dg-chip">Pairs <b id="pr">0</b>/8</span></div>
            <div class="mem-grid" id="grid"></div>
          </div>`;
        gridEl = dom.querySelector("#grid");
        deck.forEach((e, i) => {
          const card = document.createElement("div");
          card.className = "mem-card";
          card.dataset.i = i;
          card.innerHTML = `<div class="inner"><div class="face back"></div><div class="face front">${e}</div></div>`;
          card.addEventListener("click", () => flip(card));
          gridEl.appendChild(card);
        });
        shell.setScore(0, { bump: false });
      }

      const flip = (card) => {
        if (lock || over || card.classList.contains("flipped") || card.classList.contains("done")) return;
        if (!running) { running = true; startT = performance.now(); }
        sfx.flip();
        card.classList.add("flipped");
        if (!first) { first = card; return; }
        moves++;
        dom.querySelector("#mv").textContent = moves;
        const a = first;
        first = null;
        if (a.dataset.e === card.dataset.e) {
          // match (data-e set below)
          a.classList.add("done");
          card.classList.add("done");
          sfx.score(2);
          const pr = dom.querySelectorAll(".mem-card.done").length / 2;
          dom.querySelector("#pr").textContent = pr;
          if (pr === 8) {
            over = true;
            const secs = Math.round(elapsed);
            const score = Math.max(100, 1600 - moves * 30 - secs * 4);
            shell.setScore(score);
            setTimeout(() => shell.gameOver(score, { win: true, emoji: "🃏", lines: [`Cleared in ${moves} moves, ${secs}s`] }), 450);
          }
        } else {
          lock = true;
          setTimeout(() => {
            a.classList.remove("flipped");
            card.classList.remove("flipped");
            lock = false;
          }, 750);
        }
      };

      shell._gameStart = () => {
        reset();
        // tag values
        deck.forEach((e, i) => {
          const c = gridEl.querySelector(`[data-i="${i}"]`);
          c.dataset.e = e;
        });
      };

      shell._gameUpdate = (dt) => {
        if (!running || over) return;
        elapsed = (performance.now() - startT) / 1000;
        dom.querySelector("#tm").textContent = Math.floor(elapsed) + "s";
      };
      shell._gameDraw = () => {};

      shell.startOverlay();
      reset();
    },
  });
})();
