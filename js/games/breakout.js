/* AGAME+ — Breakout (power-ups, multiball) */
(() => {
  "use strict";
  const { sfx, rand, clamp, choice } = AG;

  const LW = 480, LH = 600; // logical space

  AG.register({
    id: "breakout",
    title: "Breakout",
    emoji: "🧨",
    category: "arcade",
    tagline: "Shatter the wall. Catch power-ups: wide paddle, multiball and slow-mo.",
    description:
      "A lovingly rebuilt breakout with a tougher top wall, falling power-up capsules, and satisfying physics. Move with mouse, touch or arrow keys — space or click launches the ball.",
    controls: [["mouse / ← →", "move paddle"], ["space / click", "launch"], ["touch drag", "mobile"]],
    isNew: false,
    mount(shell) {
      const CW = 9, CH = 6, BW = (LW - 40 - (CW - 1) * 10) / CW;
      const ROW_HP = [3, 3, 2, 2, 1, 1];
      const ROW_PTS = [30, 25, 20, 15, 10, 10];
      const ROW_COL = ["#f472b6", "#fb923c", "#fbbf24", "#a3e635", "#22d3ee", "#818cf8"];
      const POWER = ["wide", "multi", "slow", "life"];
      const POWER_COL = { wide: "#22d3ee", multi: "#a3e635", slow: "#fbbf24", life: "#f472b6" };
      const POWER_SYM = { wide: "W", multi: "M", slow: "S", life: "♥" };

      let bricks, balls, paddle, powers, lives, score, launch, wideT, slowT, shake, over, stars;

      const scale = () => Math.min(shell.w / LW, shell.h / LH);
      const ox = () => (shell.w - LW * scale()) / 2;
      const oy = () => (shell.h - LH * scale()) / 2;

      const toLogical = (clientX, clientY) => {
        const r = shell.frame.getBoundingClientRect();
        return {
          x: (clientX - r.left - ox()) / scale(),
          y: (clientY - r.top - oy()) / scale(),
        };
      };

      const newBall = (onPaddle = true) => ({
        x: paddle.x,
        y: onPaddle ? LH - 74 : LH - 80,
        vx: rand(-120, 120),
        vy: onPaddle ? 0 : -rand(300, 360),
        r: 8,
        stuck: onPaddle,
        trail: [],
      });

      function reset() {
        bricks = Array.from({ length: CH }, (_, r) =>
          Array.from({ length: CW }, (_, c) => ({ hp: ROW_HP[r], max: ROW_HP[r], c, r, alive: true }))
        );
        paddle = { x: LW / 2, w: 96, h: 14 };
        balls = [newBall(true)];
        powers = [];
        lives = 3;
        score = 0;
        launch = true;
        wideT = 0;
        slowT = 0;
        shake = 0;
        over = false;
        stars = Array.from({ length: 60 }, () => ({ x: rand(0, LW), y: rand(0, LH), s: rand(0.6, 1.8), v: rand(6, 20) }));
        shell.setScore(0, { bump: false });
      }

      const doLaunch = () => {
        if (!launch) return;
        for (const b of balls) {
          if (!b.stuck) continue;
          b.stuck = false;
          const a = rand(-0.5, 0.5);
          b.vx = Math.sin(a) * 340;
          b.vy = -Math.cos(a) * 340;
        }
        launch = false;
        sfx.launch();
      };

      const loseBall = (b) => {
        balls = balls.filter((x) => x !== b);
        if (balls.length === 0) {
          lives--;
          sfx.over();
          shake = 0.3;
          if (lives <= 0) {
            over = true;
            shell.gameOver(score, { emoji: "🧨", lines: ["The wall got you this time."] });
            return;
          }
          paddle.w = 96;
          wideT = 0;
          balls = [newBall(true)];
          launch = true;
        }
      };

      const hitBrick = (brick) => {
        brick.hp--;
        if (brick.hp <= 0) {
          brick.alive = false;
          const px = ox() + (brickX(brick.c) + BW / 2) * scale();
          const py = oy() + brickY(brick.r) * scale();
          shell.burst(px, py, { color: ROW_COL[brick.r], count: 12, speed: 150 });
          score += ROW_PTS[brick.r];
          if (Math.random() < 0.2) {
            powers.push({ x: brickX(brick.c) + BW / 2, y: brickY(brick.r) + 8, type: choice(POWER), vy: 130 });
          }
          sfx.hit();
        } else {
          sfx.tick();
        }
        shell.setScore(score);
      };

      const brickX = (c) => 20 + c * (BW + 10);
      const brickY = (r) => 56 + r * 30;

      const applyPower = (type) => {
        sfx.power();
        if (type === "wide") { paddle.w = Math.min(150, paddle.w + 34); wideT = 12; }
        else if (type === "slow") slowT = 7;
        else if (type === "life") lives = Math.min(5, lives + 1);
        else if (type === "multi") {
          const src = balls.filter((b) => !b.stuck);
          const base = src.length ? choice(src) : balls[0];
          if (balls.length < 6) {
            for (const ang of [-0.5, 0.5]) {
              const sp = Math.hypot(base.vx || 0, base.vy || -330);
              const a0 = Math.atan2(base.vy || -1, base.vx || 0.1) + ang;
              balls.push({ x: base.x, y: base.y, vx: Math.cos(a0) * sp, vy: Math.sin(a0) * sp, r: 8, stuck: false, trail: [] });
            }
          }
        }
      };

      shell._gameResize = () => {};

      shell._gameKey = (type, k) => {
        if (type === "down" && (k === "space" || k === "enter")) doLaunch();
      };
      shell._eatsKeys = true;

      shell.on("pointerdown", (e) => {
        const p = toLogical(e.clientX, e.clientY);
        if (p.x > 0 && p.x < LW) paddle.x = clamp(p.x, paddle.w / 2, LW - paddle.w / 2);
        if (launch) doLaunch();
      });
      shell.on("pointermove", (e) => {
        const p = toLogical(e.clientX, e.clientY);
        if (e.buttons === 0 && !AG.isTouch) paddle.x = clamp(p.x, paddle.w / 2, LW - paddle.w / 2);
        else if (AG.isTouch && e.buttons >= 0) paddle.x = clamp(p.x, paddle.w / 2, LW - paddle.w / 2);
      });

      shell._gameStart = () => reset();

      shell._gameUpdate = (dt) => {
        if (over) return;
        if (wideT > 0) { wideT -= dt; if (wideT <= 0) paddle.w = 96; }
        if (slowT > 0) slowT -= dt;
        if (shake > 0) shake -= dt;
        const speedMul = slowT > 0 ? 0.72 : 1;

        // keyboard paddle
        const kv = 520;
        if (shell.keys.has("arrowleft")) paddle.x = clamp(paddle.x - kv * dt, paddle.w / 2, LW - paddle.w / 2);
        if (shell.keys.has("arrowright")) paddle.x = clamp(paddle.x + kv * dt, paddle.w / 2, LW - paddle.w / 2);

        for (const b of balls) {
          if (b.stuck) { b.x = paddle.x; b.y = LH - 74; continue; }
          b.x += b.vx * dt * speedMul;
          b.y += b.vy * dt * speedMul;
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 8) b.trail.shift();

          // walls
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); sfx.tick(); }
          if (b.x > LW - b.r) { b.x = LW - b.r; b.vx = -Math.abs(b.vx); sfx.tick(); }
          if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); sfx.tick(); }
          if (b.y > LH + 30) { loseBall(b); continue; }

          // paddle
          const px = paddle.x - paddle.w / 2, py = LH - 82;
          if (
            b.vy > 0 &&
            b.x > px - b.r && b.x < px + paddle.w + b.r &&
            b.y + b.r > py && b.y - b.r < py + paddle.h
          ) {
            const rel = clamp((b.x - paddle.x) / (paddle.w / 2), -1, 1);
            const a = rel * (Math.PI / 3.2);
            const sp = Math.min(560, Math.hypot(b.vx, b.vy) * 1.02 + 8);
            b.vx = Math.sin(a) * sp;
            b.vy = -Math.cos(a) * sp;
            b.y = py - b.r;
            sfx.move();
          }

          // bricks
          for (const row of bricks) {
            for (const br of row) {
              if (!br.alive) continue;
              const bx = brickX(br.c), by = brickY(br.r);
              const cx = clamp(b.x, bx, bx + BW);
              const cy = clamp(b.y, by, by + 22);
              const dx = b.x - cx, dy = b.y - cy;
              if (dx * dx + dy * dy <= b.r * b.r) {
                // reflect based on penetration axis
                const fromSide = Math.abs(dx) > Math.abs(dy);
                if (fromSide) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
                else b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
                hitBrick(br);
                break;
              }
            }
          }
        }

        // power capsules
        for (let i = powers.length - 1; i >= 0; i--) {
          const p = powers[i];
          p.y += p.vy * dt;
          if (p.y > LH) { powers.splice(i, 1); continue; }
          const px = paddle.x - paddle.w / 2, py = LH - 82;
          if (p.x > px - 12 && p.x < px + paddle.w + 12 && p.y > py - 14 && p.y < py + 22) {
            applyPower(p.type);
            const gx = ox() + p.x * scale(), gy = oy() + py * scale();
            shell.burst(gx, gy, { color: POWER_COL[p.type], count: 14, speed: 160 });
            shell.popup(gx, gy - 20, p.type.toUpperCase(), POWER_COL[p.type]);
            powers.splice(i, 1);
          }
        }

        // win?
        if (bricks.every((row) => row.every((b) => !b.alive))) {
          over = true;
          shell.gameOver(score + 1000, { win: true, emoji: "🧨", lines: ["Wall destroyed! +1000 bonus"] });
        }
      };

      shell._gameDraw = () => {
        const g = shell.ctx;
        const s = scale();
        g.save();
        let sx = 0, sy = 0;
        if (shake > 0) { sx = rand(-4, 4) * shake; sy = rand(-4, 4) * shake; }
        g.translate(ox() + sx, oy() + sy);
        g.scale(s, s);

        // bg
        g.fillStyle = "#081020";
        g.fillRect(-20, -20, LW + 40, LH + 40);
        for (const st of stars) {
          st.y += st.v * 0.016;
          if (st.y > LH) { st.y = 0; st.x = rand(0, LW); }
          g.globalAlpha = 0.5;
          g.fillStyle = "#93a0c4";
          g.fillRect(st.x, st.y, st.s, st.s);
        }
        g.globalAlpha = 1;

        // bricks
        for (const row of bricks)
          for (const br of row) {
            if (!br.alive) continue;
            const x = brickX(br.c), y = brickY(br.r);
            g.fillStyle = ROW_COL[br.r];
            g.globalAlpha = 0.35 + 0.65 * (br.hp / br.max);
            rr(g, x, y, BW, 22, 5);
            g.fill();
            g.globalAlpha = 1;
            g.fillStyle = "rgba(255,255,255,0.18)";
            rr(g, x + 3, y + 3, BW - 6, 6, 3);
            g.fill();
          }

        // paddle
        g.shadowColor = "#22d3ee";
        g.shadowBlur = 16;
        g.fillStyle = "#22d3ee";
        rr(g, paddle.x - paddle.w / 2, LH - 82, paddle.w, paddle.h, 7);
        g.fill();
        g.shadowBlur = 0;

        // power-ups
        for (const p of powers) {
          g.shadowColor = POWER_COL[p.type];
          g.shadowBlur = 12;
          g.fillStyle = POWER_COL[p.type];
          rr(g, p.x - 14, p.y - 9, 28, 18, 9);
          g.fill();
          g.shadowBlur = 0;
          g.fillStyle = "#0a0d18";
          g.font = '700 12px "Chakra Petch", sans-serif';
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(POWER_SYM[p.type], p.x, p.y + 1);
        }

        // balls
        for (const b of balls) {
          for (let i = 0; i < b.trail.length; i++) {
            const t = b.trail[i];
            g.globalAlpha = (i / b.trail.length) * 0.25;
            g.fillStyle = "#fff";
            g.beginPath();
            g.arc(t.x, t.y, b.r * (i / b.trail.length), 0, Math.PI * 2);
            g.fill();
          }
          g.globalAlpha = 1;
          g.shadowColor = "#fff";
          g.shadowBlur = 12;
          g.fillStyle = "#fff";
          g.beginPath();
          g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          g.fill();
          g.shadowBlur = 0;
        }

        // lives
        g.font = '14px "Chakra Petch", sans-serif';
        g.textAlign = "left";
        g.fillStyle = "#f472b6";
        let hearts = "";
        for (let i = 0; i < lives; i++) hearts += "♥ ";
        g.fillText(hearts, 12, LH - 14);
        if (launch) {
          g.fillStyle = "rgba(232,236,248,0.7)";
          g.textAlign = "center";
          g.fillText("press space or tap to launch", LW / 2, LH - 40);
        }
        g.restore();
      };

      const rr = (g, x, y, w, h, r) => {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
      };

      shell.startOverlay();
    },
  });
})();
