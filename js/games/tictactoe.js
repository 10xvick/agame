/* AGAME+ — Tic-Tac-Toe (minimax AI — it never loses) */
(() => {
  "use strict";
  const { sfx, hs, recent } = AG;

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  const winnerOf = (b) => {
    for (const [a, m, c] of LINES) {
      if (b[a] && b[a] === b[m] && b[a] === b[c]) return { who: b[a], line: [a, m, c] };
    }
    if (b.every(Boolean)) return { who: "draw" };
    return null;
  };

  const minimax = (b, isAI) => {
    const w = winnerOf(b);
    if (w) {
      if (w.who === "O") return { s: 10 };
      if (w.who === "X") return { s: -10 };
      return { s: 0 };
    }
    let best = isAI ? -Infinity : Infinity;
    let bestMove = -1;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = isAI ? "O" : "X";
      const { s } = minimax(b, !isAI);
      b[i] = null;
      if (isAI ? s > best : s < best) {
        best = s;
        bestMove = i;
      }
    }
    return { s: best, move: bestMove };
  };

  AG.register({
    id: "tictactoe",
    title: "Tic-Tac-Toe",
    emoji: "⭕",
    category: "strategy",
    tagline: "You're X, the machine is O. It uses minimax — so it can draw, but never lose.",
    description:
      "An unbeatable classic. Win a round for +100, a draw for +25. The score carries across rounds — chase the highest match score you can.",
    controls: [["click / tap", "place an X"]],
    isNew: false,
    mount(shell) {
      let board, turn, over, matchScore, dom, gridEl;

      dom = document.createElement("div");
      dom.className = "dom-game";
      shell.frame.appendChild(dom);

      const buildDOM = () => {
        dom.innerHTML = `
          <div class="dg-inner">
            <div>
              <div class="dg-top" style="justify-content:center">
                <span class="dg-chip">Match score <b id="ms">0</b></span>
                <span class="dg-chip" id="turn">Your move (X)</span>
              </div>
              <div class="tt-grid" id="grid"></div>
            </div>
          </div>`;
        gridEl = dom.querySelector("#grid");
        for (let i = 0; i < 9; i++) {
          const c = document.createElement("div");
          c.className = "tt-cell";
          c.dataset.i = i;
          c.addEventListener("click", () => humanMove(i));
          gridEl.appendChild(c);
        }
      };

      const cellEl = (i) => gridEl.children[i];

      function resetBoard() {
        board = new Array(9).fill(null);
        turn = "X";
        over = false;
        buildDOM();
      }

      const paint = (i, v) => {
        const c = cellEl(i);
        c.textContent = v === "X" ? "✕" : "◯";
        c.classList.add("taken", v.toLowerCase());
      };

      const humanMove = (i) => {
        if (over || board[i] || turn !== "X") return;
        board[i] = "X";
        paint(i, "X");
        sfx.move();
        const w = winnerOf(board);
        if (w) return endRound(w);
        turn = "O";
        const ts = dom.querySelector("#turn");
        if (ts) ts.textContent = "O is thinking…";
        setTimeout(() => {
          if (over || shell.destroyed) return;
          const { move } = minimax(board, true);
          board[move] = "O";
          paint(move, "O");
          sfx.turn();
          const w2 = winnerOf(board);
          if (w2) return endRound(w2);
          turn = "X";
          const ts2 = dom.querySelector("#turn");
          if (ts2) ts2.textContent = "Your move (X)";
        }, 480);
      };

      const endRound = (w) => {
        over = true;
        let pts = 0, title, sub, emoji;
        if (w.who === "X") {
          pts = 100;
          title = "Round won!";
          sub = "+100";
          emoji = "🎉";
          w.line.forEach((i) => cellEl(i).classList.add("win"));
          sfx.win();
        } else if (w.who === "draw") {
          pts = 25;
          title = "Draw";
          sub = "+25 — you beat the unbeatable (partially)";
          emoji = "🤝";
          sfx.line();
        } else {
          title = "The machine wins";
          sub = "+0";
          emoji = "🤖";
          w.line.forEach((i) => cellEl(i).classList.add("win"));
          sfx.over();
        }
        matchScore += pts;
        const ts = dom.querySelector("#turn");
        if (ts) ts.textContent = w.who === "X" ? "You win the round!" : w.who === "O" ? "O takes it" : "Dead heat";
        shell.setScore(matchScore);
        // persist best manually (match continues, so no full game-over overlay)
        const res = hs.best(shell.reg.id, matchScore);
        shell.best = hs.get(shell.reg.id);
        shell.bestEl.textContent = AG.fmtScore(shell.best);
        recent.push(shell.reg.id);
        shell._showOverlay({
          emoji,
          title,
          sub: sub + (res.improved ? "  ·  New best match!" : ""),
          controls: false,
          primary: { label: "Next round", act: resetBoard },
          secondary: { label: "All games", act: () => (location.hash = "#/") },
        });
      };

      shell._gameStart = () => {
        matchScore = 0;
        resetBoard();
      };
      shell._gameUpdate = () => {};
      shell._gameDraw = () => {};

      shell.startOverlay();
    },
  });
})();
