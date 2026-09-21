/* AGAME+ — Minesweeper */
(() => {
  "use strict";
  const { sfx, randi, shuffle } = AG;

  const COLS = 10, ROWS = 10, MINES = 15;

  AG.register({
    id: "minesweeper",
    title: "Minesweeper",
    emoji: "💣",
    category: "puzzle",
    tagline: "15 mines, zero mercy. First click is always safe — after that, it's logic.",
    description:
      "The timeless logic minefield, rebuilt with a modern look. Left-click (or tap) opens, right-click (or hold on mobile) flags. Beat the clock for a big score.",
    controls: [["click / tap", "open"], ["right-click / long-press", "flag"], ["F", "toggle flag mode"]],
    isNew: false,
    mount(shell) {
      let grid, mines, flags, opened, over, started, startT, flagMode, dom;

      dom = document.createElement("div");
      dom.className = "dom-game";
      shell.frame.appendChild(dom);

      const idx = (r, c) => r * COLS + c;
      const at = (i) => grid[i];

      const neighbors = (i) => {
        const r = Math.floor(i / COLS), c = i % COLS;
        const out = [];
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(idx(nr, nc));
          }
        return out;
      };

      const placeMines = (safe) => {
        const forbidden = new Set([safe, ...neighbors(safe)]);
        const pool = shuffle([...Array(COLS * ROWS).keys()].filter((i) => !forbidden.has(i)));
        mines = new Set(pool.slice(0, MINES));
      };

      function reset() {
        grid = [...Array(COLS * ROWS)].map(() => ({ mine: false, open: false, flag: false, n: 0 }));
        mines = new Set();
        flags = 0;
        opened = 0;
        over = false;
        started = false;
        startT = 0;
        flagMode = false;
        buildDOM();
        shell.setScore(0, { bump: false });
      }

      const buildDOM = () => {
        dom.innerHTML = `
          <div class="dg-inner">
            <div class="ms-wrap">
              <div class="ms-top">
                <span class="dg-chip">💣 <b id="mc">${MINES}</b></span>
                <span class="dg-chip">⏱ <b id="tm">0s</b></span>
                <button class="dg-chip" id="fm" title="Flag mode (F) — tap cells to flag">⚑ OFF</button>
              </div>
              <div class="ms-grid" style="grid-template-columns:repeat(${COLS},auto)" id="grid"></div>
            </div>
          </div>`;
        const g = dom.querySelector("#grid");
        for (let i = 0; i < COLS * ROWS; i++) {
          const cell = document.createElement("button");
          cell.className = "ms-cell";
          cell.dataset.i = i;
          cell.addEventListener("contextmenu", (e) => { e.preventDefault(); toggleFlag(i, cell); });
          cell.addEventListener("click", () => open(i, cell));
          let holdT = null;
          cell.addEventListener("pointerdown", (e) => {
            if (AG.isTouch) {
              holdT = setTimeout(() => {
                cell._holdFired = true;
                toggleFlag(i, cell);
                sfx.flag();
              }, 450);
            }
          });
          const cancel = () => clearTimeout(holdT);
          cell.addEventListener("pointerup", cancel);
          cell.addEventListener("pointerleave", cancel);
          g.appendChild(cell);
        }
        dom.querySelector("#fm").addEventListener("click", (e) => {
          e.stopPropagation();
          flagMode = !flagMode;
          e.target.textContent = flagMode ? "⚑ ON" : "⚑ OFF";
          sfx.flag();
        });
      };

      const toggleFlag = (i, cell) => {
        const c = at(i);
        if (over || c.open) return;
        c.flag = !c.flag;
        flags += c.flag ? 1 : -1;
        cell.textContent = c.flag ? "⚑" : "";
        dom.querySelector("#mc").textContent = MINES - flags;
      };

      const cellEl = (i) => dom.querySelector(`.ms-cell[data-i="${i}"]`);

      const open = (i, cell) => {
        if (over) return;
        // a long-press just flagged this cell; ignore the release-click
        if (cell._holdFired) { cell._holdFired = false; return; }
        const c = at(i);
        if (flagMode) {
          toggleFlag(i, cellEl(i));
          return;
        }
        if (c.flag || c.open) return;
        if (!started) {
          started = true;
          startT = performance.now();
          placeMines(i);
          for (let j = 0; j < grid.length; j++) at(j).n = neighbors(j).filter((k) => mines.has(k)).length;
        }
        reveal(i);
      };

      const reveal = (i) => {
        const c = at(i);
        if (c.open || c.flag) return;
        if (mines.has(i)) {
          // boom
          over = true;
          c.open = true;
          sfx.mine();
          for (let j = 0; j < grid.length; j++) {
            const el = cellEl(j);
            if (mines.has(j)) {
              el.classList.add("open");
              el.textContent = "💣";
              if (j === i) el.classList.add("boom");
            } else if (at(j).flag) {
              el.textContent = "✗";
            }
          }
          const secs = Math.round((performance.now() - startT) / 1000);
          const score = opened * 4;
          setTimeout(() => shell.gameOver(score, { emoji: "💥", lines: [`You survived ${secs}s, opened ${opened} cells`] }), 700);
          return;
        }
        c.open = true;
        opened++;
        const el = cellEl(i);
        el.classList.add("open");
        if (c.n > 0) {
          el.textContent = c.n;
          el.classList.add("n" + c.n);
        } else {
          sfx.tick();
          neighbors(i).forEach(reveal);
        }
        // win?
        const safeLeft = COLS * ROWS - MINES - opened;
        if (safeLeft <= 0) {
          over = true;
          sfx.win();
          const secs = Math.round((performance.now() - startT) / 1000);
          const score = Math.max(100, 1200 - secs * 6);
          shell.setScore(score);
          setTimeout(() => shell.gameOver(score, { win: true, emoji: "💣", lines: [`Cleared in ${secs}s — flawless`] }), 350);
        }
      };

      shell._gameKey = (type, k) => {
        if (type !== "down") return;
        if (k === "f") {
          flagMode = !flagMode;
          const b = dom.querySelector("#fm");
          if (b) b.textContent = flagMode ? "⚑ ON" : "⚑ OFF";
        }
      };

      shell._gameStart = () => reset();

      shell._gameUpdate = () => {
        if (started && !over) dom.querySelector("#tm").textContent = Math.floor((performance.now() - startT) / 1000) + "s";
      };
      shell._gameDraw = () => {};

      shell.startOverlay();
      reset();
    },
  });
})();
