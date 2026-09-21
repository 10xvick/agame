/* AGAME+ — Neon Snake */
(() => {
  "use strict";
  const { clamp, rand, sfx } = AG;

  AG.register({
    id: "snake",
    title: "Neon Snake",
    emoji: "🐍",
    category: "arcade",
    tagline: "Eat, grow, and don't bite yourself. Speeds up with every apple.",
    description:
      "The classic, rebuilt for the modern web. Steer the snake with arrows or WASD, swipe on mobile. Every apple makes you longer — and the game faster.",
    controls: [["←↑↓→ / WASD", "steer"], ["swipe", "mobile"]],
    isNew: false,
    mount(shell) {
      const COLS = 21, ROWS = 21;
      let snake, dir, queue, food, score, grow, tickT, interval, eaten, dying, dieT, headAngle;
      let ox = 0, oy = 0, cell = 16;

      const reset = () => {
        snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        dir = { x: 1, y: 0 };
        queue = [];
        eaten = 0;
        score = 0;
        grow = 0;
        tickT = 0;
        interval = 0.14;
        dying = false;
        dieT = 0;
        placeFood();
        shell.setScore(0, { bump: false });
      };

      const placeFood = () => {
        do {
          food = { x: Math.floor(rand(0, COLS)), y: Math.floor(rand(0, ROWS)) };
        } while (snake.some((s) => s.x === food.x && s.y === food.y));
      };

      const setDir = (x, y) => {
        const last = queue.length ? queue[queue.length - 1] : dir;
        if (last.x === -x && last.y === -y) return;
        if (last.x === x && last.y === y) return;
        if (queue.length < 3) { queue.push({ x, y }); sfx.move(); }
      };

      const step = () => {
        if (queue.length) dir = queue.shift();
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        // wall
        if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) { kill(); return; }
        // self (tail cell is fine — it moves away, unless we grow)
        const body = grow > 0 ? snake : snake.slice(0, -1);
        if (body.some((s) => s.x === head.x && s.y === head.y)) { kill(); return; }
        snake.unshift(head);
        if (grow > 0) grow--;
        else snake.pop();

        if (head.x === food.x && head.y === food.y) {
          score += 10;
          eaten++;
          grow += 1;
          interval = Math.max(0.058, 0.14 - eaten * 0.0021);
          shell.setScore(score);
          const px = ox + food.x * cell + cell / 2;
          const py = oy + food.y * cell + cell / 2;
          shell.burst(px, py, { color: "#f87171", count: 16 });
          shell.popup(px, py, "+10", "#fbbf24");
          sfx.eat();
          placeFood();
        }
      };

      const kill = () => {
        if (dying) return;
        dying = true;
        dieT = 0.55;
        const px = ox + snake[0].x * cell + cell / 2;
        const py = oy + snake[0].y * cell + cell / 2;
        shell.burst(px, py, { color: "#4ade80", count: 26, speed: 240 });
        sfx.boom();
      };

      shell._gameResize = () => {
        cell = Math.floor(Math.min(shell.w, shell.h) / (COLS + 1.2));
        ox = Math.floor((shell.w - cell * COLS) / 2);
        oy = Math.floor((shell.h - cell * ROWS) / 2);
      };

      shell._gameKey = (type, k) => {
        if (type !== "down") return;
        if (k === "arrowup" || k === "w") setDir(0, -1);
        else if (k === "arrowdown" || k === "s") setDir(0, 1);
        else if (k === "arrowleft" || k === "a") setDir(-1, 0);
        else if (k === "arrowright" || k === "d") setDir(1, 0);
      };

      // touch: swipe
      let tx = 0, ty = 0;
      shell.on("pointerdown", (e) => { tx = e.clientX; ty = e.clientY; });
      shell.on("pointerup", (e) => {
        const dx = e.clientX - tx, dy = e.clientY - ty;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) setDir(Math.sign(dx), 0);
        else setDir(0, Math.sign(dy));
      });

      shell._gameStart = () => { reset(); };

      shell._gameUpdate = (dt) => {
        if (dying) {
          dieT -= dt;
          if (dieT <= 0) shell.gameOver(score, { emoji: "🐍", lines: [`Apples eaten: ${eaten}`] });
          return;
        }
        tickT += dt;
        while (tickT >= interval && !dying) { tickT -= interval; step(); }
      };

      shell._gameDraw = () => {
        const g = shell.ctx;
        // board
        g.fillStyle = "rgba(148,163,255,0.045)";
        g.fillRect(ox, oy, cell * COLS, cell * ROWS);
        g.strokeStyle = "rgba(148,163,255,0.08)";
        g.lineWidth = 1;
        for (let i = 0; i <= COLS; i++) {
          g.beginPath(); g.moveTo(ox + i * cell, oy); g.lineTo(ox + i * cell, oy + ROWS * cell); g.stroke();
        }
        for (let j = 0; j <= ROWS; j++) {
          g.beginPath(); g.moveTo(ox, oy + j * cell); g.lineTo(ox + COLS * cell, oy + j * cell); g.stroke();
        }
        // food
        const fx = ox + food.x * cell + cell / 2;
        const fy = oy + food.y * cell + cell / 2;
        const pulse = 1 + 0.12 * Math.sin(performance.now() / 180);
        g.shadowColor = "#f87171";
        g.shadowBlur = 18;
        g.fillStyle = "#f87171";
        g.beginPath();
        g.arc(fx, fy, cell * 0.32 * pulse, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = "rgba(255,255,255,0.5)";
        g.beginPath();
        g.arc(fx - cell * 0.1, fy - cell * 0.12, cell * 0.08, 0, Math.PI * 2);
        g.fill();

        // snake
        const r = cell * 0.42;
        for (let i = snake.length - 1; i >= 0; i--) {
          const s = snake[i];
          const x = ox + s.x * cell + cell / 2;
          const y = oy + s.y * cell + cell / 2;
          const t = i / Math.max(1, snake.length - 1);
          g.shadowColor = i === 0 ? "#4ade80" : "transparent";
          g.shadowBlur = i === 0 ? 16 : 0;
          g.fillStyle = i === 0 ? "#86efac" : `rgba(34,197,94,${1 - t * 0.55})`;
          g.beginPath();
          g.arc(x, y, i === 0 ? r * 1.1 : r * (1 - t * 0.25), 0, Math.PI * 2);
          g.fill();
        }
        g.shadowBlur = 0;
        // eyes
        const h = snake[0];
        const hx = ox + h.x * cell + cell / 2;
        const hy = oy + h.y * cell + cell / 2;
        const ex = dir.x, ey = dir.y;
        const px2 = -ey, py2 = ex;
        g.fillStyle = "#052e1b";
        g.beginPath();
        g.arc(hx + ex * cell * 0.16 + px2 * cell * 0.16, hy + ey * cell * 0.16 + py2 * cell * 0.16, cell * 0.09, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(hx + ex * cell * 0.16 - px2 * cell * 0.16, hy + ey * cell * 0.16 - py2 * cell * 0.16, cell * 0.09, 0, Math.PI * 2);
        g.fill();
      };

      shell.startOverlay();
    },
  });
})();
