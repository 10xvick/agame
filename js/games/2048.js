/* AGAME+ — 2048 */
(() => {
  "use strict";
  const { sfx, randi, choice } = AG;

  const PAL = {
    2: ["#e7d9c8", "#6b5d4f"], 4: ["#e8d3b9", "#6b5d4f"], 8: ["#f2b97d", "#fff"],
    16: ["#f0a460", "#fff"], 32: ["#ef9249", "#fff"], 64: ["#ee7f3d", "#fff"],
    128: ["#f6e058", "#fff"], 256: ["#f8d84b", "#fff"], 512: ["#f9cf3d", "#fff"],
    1024: ["#faf048", "#fff"], 2048: ["#e8f24a", "#fff"],
  };
  const overPal = ["#d95d55", "#fff"];

  AG.register({
    id: "2048",
    title: "2048",
    emoji: "🔢",
    category: "puzzle",
    tagline: "Slide. Merge. Chase the 2048 tile. (Then keep going — the board is infinite.)",
    description:
      "The beloved number-merge puzzle with buttery slide animations. Swipe on mobile or use the arrow keys. Can you reach 2048… or 4096? 8192?",
    controls: [["← ↑ → ↓", "slide"], ["swipe", "mobile"]],
    isNew: true,
    mount(shell) {
      let board, tiles, tileId, score, wonShown, over, animLock, boardEl, tileLayer;
      let S = 84, GAP = 10;

      const pos = (r, c) => GAP + c * (S + GAP);

      shell._gameResize = () => {
        const maxW = Math.min(shell.w * 0.92, 480);
        const maxH = Math.min(shell.h * 0.92, 480);
        const size = Math.min(maxW, maxH);
        const ns = Math.max(40, Math.min(Math.floor((size - GAP * 5) / 4), 110));
        if (!boardEl || ns === S) { S = ns; return; }
        S = ns;
        boardEl.style.setProperty("--s", S + "px");
        boardEl.style.setProperty("--g", GAP + "px");
        // reposition + resize existing tiles
        if (tiles) for (const t of tiles.values()) placeTile(t, false);
      };

      const placeTile = (t, animate = true) => {
        if (!t.el) return;
        if (!animate) t.el.style.transition = "none";
        t.el.style.width = S + "px";
        t.el.style.height = S + "px";
        t.el.style.transform = `translate(${pos(t.r, t.c)}px, ${pos(t.r, t.c)}px)`;
        if (!animate) requestAnimationFrame(() => (t.el.style.transition = ""));
        const fs = t.v < 100 ? 0.42 : t.v < 1000 ? 0.34 : 0.26;
        t.el.style.fontSize = Math.floor(S * fs) + "px";
      };

      const tileStyle = (t) => {
        const [bg, fg] = PAL[t.v] || overPal;
        t.el.style.background = bg;
        t.el.style.color = fg;
        t.el.textContent = t.v;
      };

      const addTileEl = (t) => {
        const el = document.createElement("div");
        el.className = "tile";
        el.style.width = S + "px";
        el.style.height = S + "px";
        tileLayer.appendChild(el);
        t.el = el;
        tileStyle(t);
        el.style.transform = `translate(${pos(t.r, t.c)}px, ${pos(t.r, t.c)}px) scale(0.6)`;
        el.style.opacity = "0";
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.14s, opacity 0.14s";
          el.style.transform = `translate(${pos(t.r, t.c)}px, ${pos(t.r, t.c)}px) scale(1)`;
          el.style.opacity = "1";
          setTimeout(() => (el.style.transition = ""), 160);
        });
      };

      function reset() {
        board = Array.from({ length: 4 }, () => new Array(4).fill(null));
        tiles = new Map();
        tileId = 0;
        score = 0;
        wonShown = false;
        over = false;
        animLock = false;
        if (tileLayer) tileLayer.innerHTML = "";
        spawn();
        spawn();
        shell.setScore(0, { bump: false });
      }

      const spawn = () => {
        const empty = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!board[r][c]) empty.push([r, c]);
        if (!empty.length) return;
        const [r, c] = choice(empty);
        const t = { id: ++tileId, v: randi(0, 1) ? 2 : 4, r, c, el: null };
        board[r][c] = t.id;
        tiles.set(t.id, t);
        addTileEl(t);
      };

      const moved = () => {
        // 1) slide all tiles in direction
        let any = false;
        const vertical = dir === "up" || dir === "down";
        const forward = dir === "left" || dir === "up";
        let gained = 0;

        for (let i = 0; i < 4; i++) {
          // collect line (defensive: skip any stale ids)
          const line = [];
          for (let j = 0; j < 4; j++) {
            const [r, c] = vertical ? [forward ? j : 3 - j, i] : [i, forward ? j : 3 - j];
            const t = board[r][c] ? tiles.get(board[r][c]) : null;
            if (t) line.push(t);
          }
          // merge from the front
          const result = [];
          let k = 0;
          while (k < line.length) {
            if (k + 1 < line.length && line[k].v === line[k + 1].v) {
              const a = line[k], b = line[k + 1];
              const nt = { v: a.v * 2 };
              result.push({ a, b, nt });
              gained += nt.v;
              k += 2;
            } else {
              result.push({ a: line[k], b: null, nt: null });
              k += 1;
            }
          }
          // assign target cells
          result.forEach((res, idx) => {
            const [r, c] = vertical
              ? [forward ? idx : 3 - idx, i]
              : [i, forward ? idx : 3 - idx];
            if (res.nt) {
              // both slide to target; the survivor (a) keeps its identity,
              // value is doubled after the slide animation finishes
              res.a.r = r; res.a.c = c;
              res.b.r = r; res.b.c = c;
              board[r][c] = res.a.id;
              any = true;
              placeTile(res.a);
              placeTile(res.b);
              setTimeout(() => {
                if (tiles.has(res.a.id)) {
                  res.a.v = res.nt.v;
                  tileStyle(res.a);
                  placeTile(res.a, false);
                  if (res.a.el) {
                    res.a.el.classList.add("merge");
                    setTimeout(() => res.a.el && res.a.el.classList.remove("merge"), 220);
                  }
                  if (res.b.el) res.b.el.remove();
                  tiles.delete(res.b.id);
                }
              }, 110);
            } else {
              const a = res.a;
              if (a.r !== r || a.c !== c) {
                a.r = r; a.c = c;
                placeTile(a);
                any = true;
              }
              board[r][c] = a.id;
            }
          });
        }
        // fix board for non-merged: cells may have been overwritten — rebuild from tiles
        if (any) {
          // rebuild board cleanly
          for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) board[r][c] = null;
          for (const t of tiles.values()) if (board[t.r][t.c] === null) board[t.r][t.c] = t.id;
        }
        return { any, gained };
      };

      let dir = "left";
      const doMove = (d) => {
        if (over || animLock) return;
        dir = d;
        const res = moved();
        if (!res.any) return;
        animLock = true;
        setTimeout(() => (animLock = false), 150);
        sfx.move();
        if (res.gained) {
          score += res.gained;
          shell.setScore(score);
          sfx.score(1 + Math.log2(res.gained));
        }
        setTimeout(() => {
          spawn();
          // win check
          let win = false;
          for (const t of tiles.values()) if (t.v === 2048) win = true;
          if (win && !wonShown) {
            wonShown = true;
            shell._showOverlay({
              emoji: "🏆",
              title: "You made 2048!",
              sub: "Most people stop here. You clearly don't.",
              controls: false,
              primary: { label: "Keep going", act: () => shell.overlayEl.classList.add("hidden") },
              secondary: { label: "New game", act: () => shell.start() },
            });
          }
          if (isStuck()) {
            over = true;
            setTimeout(() => shell.gameOver(score, { emoji: "🔢", lines: ["No moves left. Legendary board."] }), 250);
          }
        }, 130);
      };

      const isStuck = () => {
        for (let r = 0; r < 4; r++)
          for (let c = 0; c < 4; c++) {
            if (!board[r][c]) return false;
            const v = tiles.get(board[r][c]).v;
            if (c < 3 && board[r][c + 1] && tiles.get(board[r][c + 1]).v === v) return false;
            if (r < 3 && board[r + 1][c] && tiles.get(board[r + 1][c]).v === v) return false;
          }
        return true;
      };

      shell._gameKey = (type, k) => {
        if (type !== "down") return;
        if (k === "arrowleft") doMove("left");
        else if (k === "arrowright") doMove("right");
        else if (k === "arrowup") doMove("up");
        else if (k === "arrowdown") doMove("down");
      };

      let tx = 0, ty = 0;
      shell.on("pointerdown", (e) => { tx = e.clientX; ty = e.clientY; });
      shell.on("pointerup", (e) => {
        const dx = e.clientX - tx, dy = e.clientY - ty;
        if (Math.abs(dx) < 26 && Math.abs(dy) < 26) return;
        if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
        else doMove(dy > 0 ? "down" : "up");
      });

      shell._gameStart = () => reset();

      // no per-frame drawing needed
      shell._gameUpdate = () => {};
      shell._gameDraw = () => {};

      shell.startOverlay();
      // build DOM after first resize so S is set
      const frame = shell.frame;
      const dom = document.createElement("div");
      dom.className = "dom-game";
      frame.appendChild(dom);
      shell._gameResize();
      dom.innerHTML = `<div class="dg-inner"><div class="g2048" style="width:calc(var(--s)*4 + var(--g)*5);height:calc(var(--s)*4 + var(--g)*5);gap:var(--g);padding:var(--g);display:grid;grid-template-columns:repeat(4,var(--s));grid-template-rows:repeat(4,var(--s))"></div></div>`;
      boardEl = dom.querySelector(".g2048");
      const cellLayer = document.createElement("div");
      cellLayer.style.cssText = "display:contents";
      for (let i = 0; i < 16; i++) {
        const c = document.createElement("div");
        c.className = "cell";
        boardEl.appendChild(c);
      }
      tileLayer = document.createElement("div");
      tileLayer.style.cssText = "position:absolute;inset:0;pointer-events:none";
      boardEl.style.position = "relative";
      boardEl.appendChild(tileLayer);
      // re-run so tiles position with final S
      shell._gameResize();
      reset();
    },
  });
})();
