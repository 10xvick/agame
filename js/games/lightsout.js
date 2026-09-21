/* AGAME+ — Lights Out */
(() => {
  "use strict";
  const { sfx, randi, choice, shuffle } = AG;

  const N = 5;
  const PAR_PRESSES = 6;

  AG.register({
    id: "lightsout",
    title: "Lights Out",
    emoji: "💡",
    category: "puzzle",
    tagline: "Every press flips a cross. Turn the whole board off. Easier to say than to do.",
    description:
      "Pressing a light toggles it and its four neighbours. The board always starts from a solvable scramble — beat the par press count for a bonus.",
    controls: [["click / tap", "press a light"]],
    isNew: false,
    mount(shell) {
      let board, moves, par, over, dom, gridEl;

      dom = document.createElement("div");
      dom.className = "dom-game";
      shell.frame.appendChild(dom);

      const idx = (r, c) => r * N + c;
      const flipCell = (r, c) => {
        board[idx(r, c)] ^= 1;
        if (r > 0) board[idx(r - 1, c)] ^= 1;
        if (r < N - 1) board[idx(r + 1, c)] ^= 1;
        if (c > 0) board[idx(r, c - 1)] ^= 1;
        if (c < N - 1) board[idx(r, c + 1)] ^= 1;
      };

      function reset() {
        board = new Array(N * N).fill(0);
        moves = 0;
        par = PAR_PRESSES;
        over = false;
        // guaranteed-solvable scramble: apply random presses from the all-off state
        for (let i = 0; i < PAR_PRESSES; i++) {
          flipCell(randi(0, N - 1), randi(0, N - 1));
        }
        if (board.every((v) => !v)) reset(); // astronomically unlikely, but safe
        buildDOM();
        shell.setScore(0, { bump: false });
      }

      const buildDOM = () => {
        const lit = board.filter(Boolean).length;
        dom.innerHTML = `
          <div class="dg-inner">
            <div>
              <div class="dg-top" style="justify-content:center">
                <span class="dg-chip">Presses <b id="mv">0</b></span>
                <span class="dg-chip">Par <b>${par}</b></span>
              </div>
              <div class="lo-grid" id="grid"></div>
              <div class="lo-status" id="st">${lit} lights on — turn them all off</div>
            </div>
          </div>`;
        gridEl = dom.querySelector("#grid");
        for (let i = 0; i < N * N; i++) {
          const c = document.createElement("div");
          c.className = "lo-cell" + (board[i] ? " on" : "");
          c.dataset.i = i;
          c.addEventListener("click", () => press(i, c));
          gridEl.appendChild(c);
        }
      };

      const updateStatus = () => {
        const lit = board.filter(Boolean).length;
        const st = dom.querySelector("#st");
        if (st) st.textContent = lit ? `${lit} lights on — turn them all off` : "dark!";
      };

      const press = (i, c) => {
        if (over) return;
        const r = Math.floor(i / N), cc = i % N;
        flipCell(r, cc);
        moves++;
        dom.querySelector("#mv").textContent = moves;
        // redraw all (cheap: 25 cells)
        gridEl.querySelectorAll(".lo-cell").forEach((el) => {
          el.classList.toggle("on", !!board[+el.dataset.i]);
        });
        sfx.tick();
        updateStatus();
        if (!board.some(Boolean)) {
          over = true;
          sfx.win();
          const bonus = moves <= par ? 200 : 0;
          const score = Math.max(50, 1000 - moves * 20 + bonus);
          shell.setScore(score);
          setTimeout(() =>
            shell.gameOver(score, {
              win: true,
              emoji: "💡",
              lines: [`Solved in ${moves} presses`, moves <= par ? `Par ${par} beaten — +200 bonus!` : `Par was ${par}. Try to beat it.`],
            }), 450
          );
        }
      };

      shell._gameStart = () => reset();
      shell._gameUpdate = () => {};
      shell._gameDraw = () => {};

      shell.startOverlay();
      reset();
    },
  });
})();
