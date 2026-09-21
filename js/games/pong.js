/* AGAME+ — Pong (vs AI, first to 7) */
(() => {
  "use strict";
  const { sfx, rand, clamp } = AG;

  const LW = 800, LH = 500;
  const WIN = 7;

  AG.register({
    id: "pong",
    title: "Neon Pong",
    emoji: "🏓",
    category: "arcade",
    tagline: "You're cyan, the AI is pink. First to 7 takes the point... and the match.",
    description:
      "The original 1972 duel, rebuilt with glow. The ball speeds up with every hit — and the AI actually reads your shots, so start it off the edge.",
    controls: [["mouse / touch", "move paddle"], ["W / S", "move"], ["↑ / ↓", "move"]],
    isNew: false,
    mount(shell) {
      let py, ay, ball, pScore, aScore, over, countT, countN, serveDir, aiErr, aiErrT;
      const PW = 12, PH = 88, M = 40;

      const scale = () => Math.min(shell.w / LW, shell.h / LH);
      const ox = () => (shell.w - LW * scale()) / 2;
      const oy = () => (shell.h - LH * scale()) / 2;

      function reset() {
        py = LH / 2;
        ay = LH / 2;
        pScore = 0;
        aScore = 0;
        over = false;
        countT = 0;
        countN = 0;
        serveDir = Math.random() < 0.5 ? 1 : -1;
        aiErr = 0;
        aiErrT = 0;
        serveBall();
        shell.setScore(0, { bump: false });
      }

      function serveBall() {
        ball = {
          x: LW / 2,
          y: LH / 2,
          vx: serveDir * 330,
          vy: rand(-140, 140),
          r: 9,
          speed: 330,
          trail: [],
        };
      }

      const point = (toPlayer) => {
        if (toPlayer) pScore++;
        else aScore++;
        shell.setScore(pScore * 10 + aScore);
        sfx.score(toPlayer ? 2 : 1);
        if (pScore >= WIN || aScore >= WIN) {
          over = true;
          shell.gameOver(
            pScore * 100 + aScore * 10,
            {
              win: pScore >= WIN,
              emoji: pScore >= WIN ? "🏆" : "🤖",
              lines: [`${pScore} : ${aScore}`],
            }
          );
          return;
        }
        serveDir = toPlayer ? -1 : 1; // serve toward the player who lost the point? classic: toward loser
        countT = 1.1;
        countN = 3;
        ball.x = LW / 2;
        ball.y = LH / 2;
        ball.vx = 0;
        ball.vy = 0;
      };

      shell._gameKey = (type, k) => {
        if (type !== "down") return;
        if (k === "w") shell.keys.add("w");
        if (k === "s") shell.keys.add("s");
      };

      const toLogicalY = (clientY) => {
        const r = shell.frame.getBoundingClientRect();
        return (clientY - r.top - oy()) / scale();
      };
      shell.on("pointermove", (e) => {
        if (AG.isTouch || e.buttons === 0) py = clamp(toLogicalY(e.clientY), PH / 2, LH - PH / 2);
      });
      shell.on("pointerdown", (e) => {
        py = clamp(toLogicalY(e.clientY), PH / 2, LH - PH / 2);
      });

      shell._gameStart = () => reset();

      shell._gameUpdate = (dt) => {
        if (over) return;
        // player paddle
        const pv = 480;
        if (shell.keys.has("arrowup") || shell.keys.has("w")) py -= pv * dt;
        if (shell.keys.has("arrowdown") || shell.keys.has("s")) py += pv * dt;
        py = clamp(py, PH / 2, LH - PH / 2);

        // AI paddle
        aiErrT -= dt;
        if (aiErrT <= 0) {
          aiErr = rand(-70, 70) * (ball.vx > 0 ? 1 : 0.35);
          aiErrT = rand(0.5, 1.1);
        }
        const target = ball.vx > 0 ? ball.y + aiErr : LH / 2 + (ball.y - LH / 2) * 0.25;
        const diff = target - ay;
        const aiSpeed = 330 + (pScore + aScore) * 14;
        ay += clamp(diff, -aiSpeed * dt, aiSpeed * dt);
        ay = clamp(ay, PH / 2, LH - PH / 2);

        // countdown
        if (countT > 0) {
          countT -= dt;
          ball.x = LW / 2;
          ball.y = LH / 2;
          if (countT <= 0) {
            ball.vx = serveDir * ball.speed;
            ball.vy = rand(-140, 140);
          }
          return;
        }

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 10) ball.trail.shift();

        if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); sfx.tick(); }
        if (ball.y > LH - ball.r) { ball.y = LH - ball.r; ball.vy = -Math.abs(ball.vy); sfx.tick(); }

        // player paddle (left)
        if (
          ball.vx < 0 &&
          ball.x - ball.r < M + PW && ball.x > M - 20 &&
          ball.y > py - PH / 2 - ball.r && ball.y < py + PH / 2 + ball.r
        ) {
          const rel = clamp((ball.y - py) / (PH / 2), -1, 1);
          ball.speed = Math.min(760, ball.speed * 1.045);
          const a = rel * (Math.PI / 3.4);
          ball.vx = Math.cos(a) * ball.speed;
          ball.vy = Math.sin(a) * ball.speed;
          ball.x = M + PW + ball.r;
          sfx.move();
        }
        // AI paddle (right)
        if (
          ball.vx > 0 &&
          ball.x + ball.r > LW - M - PW && ball.x < LW - M + 20 &&
          ball.y > ay - PH / 2 - ball.r && ball.y < ay + PH / 2 + ball.r
        ) {
          const rel = clamp((ball.y - ay) / (PH / 2), -1, 1);
          ball.speed = Math.min(760, ball.speed * 1.045);
          const a = Math.PI - rel * (Math.PI / 3.4);
          ball.vx = Math.cos(a) * ball.speed;
          ball.vy = Math.sin(a) * ball.speed;
          ball.x = LW - M - PW - ball.r;
          sfx.move();
        }

        if (ball.x < -30) point(false);
        else if (ball.x > LW + 30) point(true);
      };

      shell._gameDraw = () => {
        const g = shell.ctx;
        const s = scale();
        g.save();
        g.translate(ox(), oy());
        g.scale(s, s);

        g.fillStyle = "#070b16";
        g.fillRect(-20, -20, LW + 40, LH + 40);

        // court
        g.strokeStyle = "rgba(148,163,255,0.25)";
        g.lineWidth = 3;
        g.strokeRect(14, 14, LW - 28, LH - 28);
        g.setLineDash([16, 20]);
        g.strokeStyle = "rgba(148,163,255,0.3)";
        g.beginPath();
        g.moveTo(LW / 2, 14);
        g.lineTo(LW / 2, LH - 14);
        g.stroke();
        g.setLineDash([]);

        // score
        g.font = '700 74px "Chakra Petch", sans-serif';
        g.textAlign = "center";
        g.fillStyle = "rgba(34,211,238,0.28)";
        g.fillText(String(pScore), LW / 2 - 120, 100);
        g.fillStyle = "rgba(244,114,182,0.28)";
        g.fillText(String(aScore), LW / 2 + 120, 100);

        // paddles
        g.shadowColor = "#22d3ee";
        g.shadowBlur = 18;
        g.fillStyle = "#22d3ee";
        rr(g, M, py - PH / 2, PW, PH, 6);
        g.fill();
        g.shadowColor = "#f472b6";
        g.fillStyle = "#f472b6";
        rr(g, LW - M - PW, ay - PH / 2, PW, PH, 6);
        g.fill();
        g.shadowBlur = 0;

        // ball
        for (let i = 0; i < ball.trail.length; i++) {
          const t = ball.trail[i];
          g.globalAlpha = (i / ball.trail.length) * 0.3;
          g.fillStyle = "#fff";
          g.beginPath();
          g.arc(t.x, t.y, ball.r * (i / ball.trail.length), 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        g.shadowColor = "#fff";
        g.shadowBlur = 14;
        g.fillStyle = "#fff";
        g.beginPath();
        g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;

        if (countT > 0) {
          g.fillStyle = "rgba(232,236,248,0.85)";
          g.font = '700 60px "Chakra Petch", sans-serif';
          g.textAlign = "center";
          g.fillText(String(Math.ceil(countT / 0.37)), LW / 2, LH / 2 + 20);
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
