/* AGAME+ — Tetris (7-bag, hold, ghost, next×3) */
(() => {
  "use strict";
  const { sfx, clamp } = AG;

  const COLS = 10, ROWS = 20;
  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  };
  const COLORS = { I: "#22d3ee", J: "#818cf8", L: "#fb923c", O: "#fbbf24", S: "#a3e635", T: "#c084fc", Z: "#f87171" };
  const LINE_PTS = [0, 100, 300, 500, 800];

  AG.register({
    id: "tetris",
    title: "Tetris",
    emoji: "🧱",
    category: "arcade",
    tagline: "7-bag randomizer, hold, ghost piece and combo scoring. How high can you stack?",
    description:
      "A faithful, modern take on the world's most famous block-stacker. Use hold to save a piece, watch the ghost for landing spots, and clear lines for big point multipliers.",
    controls: [["← →", "move"], ["↑ / X", "rotate"], ["Z", "rotate ccw"], ["↓", "soft drop"], ["Space", "hard drop"], ["C", "hold"], ["P", "pause"]],
    isNew: false,
    mount(shell) {
      let grid, cur, hold, canHold, bag, next, score, lines, level, gravT, lockT, onGround, spawnT, clearing, clearRows, clearT, over, dropCd, heldDir, dirT;

      const rot = (m, d) => {
        const n = m.length;
        const out = Array.from({ length: n }, () => new Array(n).fill(0));
        for (let y = 0; y < n; y++)
          for (let x = 0; x < n; x++) {
            if (d > 0) out[x][n - 1 - y] = m[y][x]; // clockwise
            else out[n - 1 - x][y] = m[y][x];       // counter-clockwise
          }
        return out;
      };

      const newPiece = (type) => ({
        type,
        m: SHAPES[type].map((r) => r.slice()),
        x: Math.floor((COLS - SHAPES[type][0].length) / 2),
        y: type === "I" ? -1 : 0,
      });

      const refill = () => {
        while (next.length < 4) {
          if (bag.length === 0) bag = shuffleBag();
          next.push(bag.pop());
        }
      };
      const shuffleBag = () => {
        const b = ["I", "J", "L", "O", "S", "T", "Z"];
        for (let i = b.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [b[i], b[j]] = [b[j], b[i]];
        }
        return b;
      };

      const collides = (m, px, py) => {
        for (let y = 0; y < m.length; y++)
          for (let x = 0; x < m[y].length; x++) {
            if (!m[y][x]) continue;
            const gx = px + x, gy = py + y;
            if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
            if (gy >= 0 && grid[gy][gx]) return true;
          }
        return false;
      };

      const tryMove = (dx, dy) => {
        if (!collides(cur.m, cur.x + dx, cur.y + dy)) {
          cur.x += dx;
          cur.y += dy;
          return true;
        }
        return false;
      };

      const tryRotate = (d) => {
        if (cur.type === "O") return;
        const rm = rot(cur.m, d);
        const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
        for (const [kx, ky] of kicks) {
          if (!collides(rm, cur.x + kx, cur.y + ky)) {
            cur.m = rm;
            cur.x += kx;
            cur.y += ky;
            sfx.turn();
            lockReset();
            return;
          }
        }
      };

      const ghostY = () => {
        let gy = cur.y;
        while (!collides(cur.m, cur.x, gy + 1)) gy++;
        return gy;
      };

      const lockReset = () => {
        if (onGround && lockT < 0.9) lockT = 0;
        onGround = false;
      };

      const spawn = () => {
        refill();
        cur = newPiece(next.shift());
        refill();
        canHold = true;
        lockT = 0;
        onGround = false;
        gravT = 0;
        if (collides(cur.m, cur.x, cur.y)) doGameOver();
      };

      const doHold = () => {
        if (!canHold) return;
        sfx.move();
        const t = cur.type;
        if (hold) {
          cur = newPiece(hold);
          if (collides(cur.m, cur.x, cur.y)) { doGameOver(); return; }
        }
        hold = t;
        canHold = false;
      };

      const hardDrop = () => {
        const d = ghostY() - cur.y;
        score += d * 2;
        cur.y = ghostY();
        shell.setScore(score);
        shell.burst(boardX() + (cur.x + 1.5) * cell(), boardY() + (cur.y + 1.5) * cell(), { color: COLORS[cur.type], count: 8, speed: 120 });
        lockPiece();
      };

      const lockPiece = () => {
        let toppedOut = false;
        for (let y = 0; y < cur.m.length; y++)
          for (let x = 0; x < cur.m[y].length; x++) {
            if (!cur.m[y][x]) continue;
            const gy = cur.y + y;
            if (gy < 0) { toppedOut = true; continue; }
            grid[gy][cur.x + x] = cur.type;
          }
        sfx.drop();
        // lines?
        clearRows = [];
        for (let y = 0; y < ROWS; y++) if (grid[y].every((v) => v)) clearRows.push(y);
        if (clearRows.length) {
          clearing = true;
          clearT = 0.22;
          score += LINE_PTS[clearRows.length] * level;
          sfx.line();
        } else {
          spawn();
        }
        if (toppedOut) doGameOver();
        shell.setScore(score);
      };

      const finishClear = () => {
        for (const y of clearRows) {
          grid.splice(y, 1);
          grid.unshift(new Array(COLS).fill(0));
        }
        lines += clearRows.length;
        level = Math.floor(lines / 10) + 1;
        clearing = false;
        clearRows = [];
        spawn();
      };

      const doGameOver = () => {
        if (over) return;
        over = true;
        sfx.boom();
        shell.gameOver(score, {
          emoji: "🧱",
          lines: [`Lines: ${lines}`, `Level: ${level}`],
        });
      };

      shell._gameStart = () => {
        grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
        bag = [];
        next = [];
        hold = null;
        cur = null;
        score = 0;
        lines = 0;
        level = 1;
        gravT = 0;
        lockT = 0;
        onGround = false;
        clearing = false;
        clearRows = [];
        over = false;
        canHold = true;
        dropCd = 0;
        shell.setScore(0, { bump: false });
        spawn();
      };

      /* ---------- layout ---------- */
      let cs = 24;
      const boardX = () => Math.floor((shell.w - COLS * cs) / 2);
      const boardY = () => Math.floor((shell.h - ROWS * cs) / 2);
      const cell = () => cs;

      shell._gameResize = () => {
        cs = Math.floor(Math.min(shell.w / (COLS + 5.4), shell.h / (ROWS + 1.6)));
        cs = clamp(cs, 12, 40);
      };

      /* ---------- input ---------- */
      const doSoft = () => {
        if (!clearing && tryMove(0, 1)) { score += 1; shell.setScore(score); }
      };

      shell._gameKey = (type, k) => {
        if (type !== "down" || over || clearing) return;
        if (k === "arrowleft") { if (tryMove(-1, 0)) { sfx.move(); lockReset(); } heldDir = -1; dirT = 0; }
        else if (k === "arrowright") { if (tryMove(1, 0)) { sfx.move(); lockReset(); } heldDir = 1; dirT = 0; }
        else if (k === "arrowdown") doSoft();
        else if (k === "arrowup" || k === "x") tryRotate(1);
        else if (k === "z") tryRotate(-1);
        else if (k === "space") hardDrop();
        else if (k === "c") doHold();
      };
      shell.on("keyup", (e) => { if (["arrowleft", "arrowright"].includes(e.key.toLowerCase())) heldDir = 0; });

      /* ---------- touchpad ---------- */
      shell.touchpad([
        [
          { label: "⟲", on: () => tryRotate(-1) },
          { label: "◀", on: () => { if (tryMove(-1, 0)) sfx.move(); } },
          { label: "▶", on: () => { if (tryMove(1, 0)) sfx.move(); } },
          { label: "⟳", on: () => tryRotate(1) },
        ],
        [
          { label: "HOLD", on: doHold },
          { label: "▼", on: doSoft },
          { label: "⤓", on: hardDrop },
        ],
      ]);

      shell._gameUpdate = (dt) => {
        if (over) return;
        // held-direction auto repeat
        if (heldDir) {
          dirT += dt;
          if (dirT > 0.13) { dirT = 0; if (tryMove(heldDir, 0)) sfx.move(); }
        }
        if (clearing) {
          clearT -= dt;
          if (clearT <= 0) finishClear();
          return;
        }
        // gravity + lock
        gravT += dt;
        const interval = Math.max(0.09, 0.8 * Math.pow(0.85, level - 1));
        if (!onGround && gravT >= interval) {
          gravT = 0;
          if (!tryMove(0, 1)) onGround = true;
        }
        if (onGround) {
          lockT += dt;
          if (lockT >= 0.5) lockPiece();
        } else {
          lockT = 0;
        }
      };

      /* ---------- draw ---------- */
      const drawCell = (g, x, y, type, alpha = 1) => {
        const pad = 1;
        g.globalAlpha = alpha;
        g.shadowColor = COLORS[type];
        g.shadowBlur = alpha > 0.5 ? 8 : 0;
        g.fillStyle = COLORS[type];
        roundRect(g, x + pad, y + pad, cs - pad * 2, cs - pad * 2, 5);
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = "rgba(255,255,255,0.25)";
        roundRect(g, x + pad + 3, y + pad + 3, cs - pad * 2 - 6, Math.max(3, cs * 0.18), 3);
        g.fill();
        g.globalAlpha = 1;
      };

      const roundRect = (g, x, y, w, h, r) => {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
      };

      shell._gameDraw = () => {
        const g = shell.ctx;
        const bx = boardX(), by = boardY();
        // board bg
        g.fillStyle = "rgba(148,163,255,0.05)";
        roundRect(g, bx - 6, by - 6, COLS * cs + 12, ROWS * cs + 12, 10);
        g.fill();
        g.strokeStyle = "rgba(148,163,255,0.16)";
        g.lineWidth = 1;
        roundRect(g, bx - 6, by - 6, COLS * cs + 12, ROWS * cs + 12, 10);
        g.stroke();
        g.strokeStyle = "rgba(148,163,255,0.05)";
        for (let i = 1; i < COLS; i++) { g.beginPath(); g.moveTo(bx + i * cs, by); g.lineTo(bx + i * cs, by + ROWS * cs); g.stroke(); }
        for (let j = 1; j < ROWS; j++) { g.beginPath(); g.moveTo(bx, by + j * cs); g.lineTo(bx + COLS * cs, by + j * cs); g.stroke(); }

        // grid
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++) {
            if (!grid[y][x]) continue;
            const isClear = clearing && clearRows.includes(y);
            const alpha = isClear ? clearT / 0.22 : 1;
            if (isClear) {
              g.fillStyle = `rgba(255,255,255,${0.4 * alpha})`;
              g.fillRect(bx + x * cs, by + y * cs, cs, cs);
            } else drawCell(g, bx + x * cs, by + y * cs, grid[y][x]);
          }

        if (cur && !over) {
          // ghost
          const gy = ghostY();
          if (gy !== cur.y) {
            for (let y = 0; y < cur.m.length; y++)
              for (let x = 0; x < cur.m[y].length; x++)
                if (cur.m[y][x] && gy + y >= 0) {
                  g.globalAlpha = 0.18;
                  g.fillStyle = COLORS[cur.type];
                  g.fillRect(bx + (cur.x + x) * cs + 2, by + (gy + y) * cs + 2, cs - 4, cs - 4);
                  g.globalAlpha = 1;
                }
          }
          // current
          for (let y = 0; y < cur.m.length; y++)
            for (let x = 0; x < cur.m[y].length; x++)
              if (cur.m[y][x] && cur.y + y >= 0) drawCell(g, bx + (cur.x + x) * cs, by + (cur.y + y) * cs, cur.type);
        }

        // side panels
        const panel = (px, title) => {
          g.fillStyle = "rgba(148,163,255,0.05)";
          roundRect(g, px, by + 10, cs * 2.6, cs * 3.4, 10);
          g.fill();
          g.fillStyle = "rgba(148,163,255,0.5)";
          g.font = `600 ${Math.max(10, cs * 0.34)}px "Chakra Petch", sans-serif`;
          g.textAlign = "center";
          g.fillText(title, px + cs * 1.3, by + 10 + cs * 0.45);
        };
        const mini = (px, py, type) => {
          if (!type) return;
          const s = cs * 0.52;
          const sh = SHAPES[type];
          const minX = Math.min(...sh.map((r) => r.findIndex(Boolean)));
          const maxX = Math.max(...sh.map((r) => { const f = r.lastIndexOf(1); return f < 0 ? 0 : f; }));
          const minY = sh.findIndex((r) => r.some(Boolean));
          const maxY = sh.length - 1 - [...sh].reverse().findIndex((r) => r.some(Boolean));
          const w = (maxX - minX + 1) * s, h = (maxY - minY + 1) * s;
          const ox = px + cs * 1.3 - w / 2, oy = py + cs * 1.5 - h / 2 + cs * 0.35;
          for (let y = 0; y < sh.length; y++)
            for (let x = 0; x < sh[y].length; x++)
              if (sh[y][x]) {
                g.fillStyle = COLORS[type];
                g.globalAlpha = 0.9;
                roundRect(g, ox + (x - minX) * s + 1, oy + (y - minY) * s + 1, s - 2, s - 2, 4);
                g.fill();
                g.globalAlpha = 1;
              }
        };
        panel(bx - cs * 4, "HOLD");
        mini(bx - cs * 4, by + 10, hold);
        panel(bx + COLS * cs + cs * 1.4, "NEXT");
        for (let i = 0; i < 3; i++) {
          g.globalAlpha = 1 - i * 0.28;
          mini(bx + COLS * cs + cs * 1.4, by + 10 + i * cs * 1.35, next[i]);
          g.globalAlpha = 1;
        }
        // level
        g.fillStyle = "rgba(148,163,255,0.5)";
        g.font = `600 ${Math.max(10, cs * 0.34)}px "Chakra Petch", sans-serif`;
        g.textAlign = "center";
        g.fillText("LEVEL", bx + COLS * cs + cs * 2.7, by + 10 + cs * 4.2);
        g.fillStyle = "#e8ecf8";
        g.font = `700 ${Math.max(14, cs * 0.6)}px "Chakra Petch", sans-serif`;
        g.fillText(String(level), bx + COLS * cs + cs * 2.7, by + 10 + cs * 4.85);
      };

      shell.startOverlay();
    },
  });
})();
