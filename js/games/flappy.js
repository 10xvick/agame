/* AGAME+ — Flappy Block */
(() => {
  "use strict";
  const { sfx, rand, clamp } = AG;

  const LW = 400, LH = 640;

  AG.register({
    id: "flappy",
    title: "Flappy Block",
    emoji: "🐤",
    category: "arcade",
    tagline: "One tap to flap. The pipes don't care how close you were.",
    description:
      "A blocky little bird with zero self-preservation instincts. Tap, click or press space to flap — thread the gaps before the pipes get tighter and faster.",
    controls: [["space / click / tap", "flap"]],
    isNew: false,
    mount(shell) {
      let bird, pipes, score, dead, deadT, t, clouds, groundX, bestSoFar;

      const scale = () => Math.min(shell.w / LW, shell.h / LH);
      const ox = () => (shell.w - LW * scale()) / 2;
      const oy = () => (shell.h - LH * scale()) / 2;

      const GROUND = 64;

      function reset() {
        bird = { x: LW * 0.3, y: LH / 2 - 40, vy: 0, rot: 0 };
        pipes = [];
        score = 0;
        dead = false;
        deadT = 0;
        t = 0;
        groundX = 0;
        bestSoFar = 0;
        clouds = Array.from({ length: 5 }, () => ({ x: rand(0, LW), y: rand(30, LH * 0.6), s: rand(0.5, 1.1), v: rand(8, 18) }));
        shell.setScore(0, { bump: false });
      }

      const flap = () => {
        if (dead) return;
        bird.vy = -390;
        sfx.flip();
      };

      const spawnPipe = () => {
        const gap = clamp(170 - t * 1.1, 118, 170);
        const topH = rand(70, LH - GROUND - 70 - gap);
        pipes.push({ x: LW + 40, gap, topH, passed: false });
      };

      shell._gameKey = (type, k) => {
        if (type !== "down") return;
        if (k === "space" || k === "arrowup" || k === "w") flap();
      };
      shell.on("pointerdown", (e) => {
        if (e.target.closest("[data-act]")) return;
        flap();
      });

      shell._gameStart = () => reset();

      shell._gameUpdate = (dt) => {
        t += dt;
        const speed = clamp(150 + t * 1.6, 150, 235);
        groundX = (groundX + speed * dt) % 26;

        for (const c of clouds) {
          c.x -= c.v * dt * (speed / 150);
          if (c.x < -60) { c.x = LW + 60; c.y = rand(30, LH * 0.6); }
        }

        if (dead) {
          deadT += dt;
          bird.vy += 1500 * dt;
          bird.y = Math.min(bird.y + bird.vy * dt, LH - GROUND - 16);
          bird.rot = Math.min(bird.rot + 4 * dt, Math.PI / 2);
          if (deadT > 0.8) {
            shell.gameOver(score, { emoji: "🐤", lines: [score === 1 ? "A perfect 1. Respect." : "The pipes win... this time."] });
          }
          return;
        }

        bird.vy += 1500 * dt;
        bird.vy = Math.min(bird.vy, 700);
        bird.y += bird.vy * dt;
        bird.rot = clamp(bird.vy / 500, -0.5, 1.2);

        // pipes
        if (pipes.length === 0 || pipes[pipes.length - 1].x < LW - 235) spawnPipe();
        for (let i = pipes.length - 1; i >= 0; i--) {
          const p = pipes[i];
          p.x -= speed * dt;
          if (p.x < -60) { pipes.splice(i, 1); continue; }
          if (!p.passed && p.x + 54 < bird.x) {
            p.passed = true;
            score++;
            bestSoFar = Math.max(bestSoFar, score);
            shell.setScore(score);
            sfx.score(score);
          }
          // collision
          const br = 15;
          if (bird.x + br > p.x && bird.x - br < p.x + 54) {
            if (bird.y - br < p.topH || bird.y + br > p.topH + p.gap) {
              dead = true;
              deadT = 0;
              shake = 0.25;
              sfx.boom();
              shell.burst(ox() + bird.x * scale(), oy() + bird.y * scale(), { color: "#fbbf24", count: 20, speed: 220 });
            }
          }
        }

        // ground / ceiling
        if (bird.y + 15 > LH - GROUND) {
          dead = true;
          deadT = 0;
          bird.y = LH - GROUND - 15;
          sfx.boom();
        }
        if (bird.y < -20) bird.y = -20;
      };
      let shake = 0;

      shell._gameDraw = () => {
        const g = shell.ctx;
        const s = scale();
        g.save();
        if (shake > 0) { shake -= 0.016; g.translate(rand(-3, 3), rand(-3, 3)); }
        g.translate(ox(), oy());
        g.scale(s, s);

        // sky
        const grad = g.createLinearGradient(0, 0, 0, LH);
        grad.addColorStop(0, "#0b2a4a");
        grad.addColorStop(1, "#0e4a6b");
        g.fillStyle = grad;
        g.fillRect(-20, -20, LW + 40, LH + 40);

        // clouds
        g.fillStyle = "rgba(255,255,255,0.13)";
        for (const c of clouds) {
          g.beginPath();
          g.arc(c.x, c.y, 26 * c.s, 0, Math.PI * 2);
          g.arc(c.x + 22 * c.s, c.y + 6, 20 * c.s, 0, Math.PI * 2);
          g.fill();
        }

        // pipes
        for (const p of pipes) {
          drawPipe(g, p.x, 0, p.topH, true);
          drawPipe(g, p.x, p.topH + p.gap, LH - GROUND - (p.topH + p.gap), false);
        }

        // ground
        g.fillStyle = "#1c2b12";
        g.fillRect(-20, LH - GROUND, LW + 40, GROUND + 20);
        g.fillStyle = "#3f6212";
        g.fillRect(-20, LH - GROUND, LW + 40, 10);
        g.fillStyle = "rgba(163,230,53,0.5)";
        for (let x = -26 - groundX; x < LW + 30; x += 26) {
          g.save();
          g.translate(x, LH - GROUND + 10);
          g.transform(1, 0, -0.6, 1, 0, 0);
          g.fillRect(0, 0, 13, GROUND - 10);
          g.restore();
        }

        // bird (a square, obviously)
        g.save();
        g.translate(bird.x, bird.y);
        g.rotate(bird.rot);
        g.shadowColor = "#fbbf24";
        g.shadowBlur = 16;
        g.fillStyle = "#fbbf24";
        rr(g, -15, -15, 30, 30, 8);
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = "#fde68a";
        rr(g, -10, 2, 22, 12, 6);
        g.fill();
        // eye
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(6, -5, 6.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#0a0d18";
        g.beginPath(); g.arc(8, -5, 3, 0, Math.PI * 2); g.fill();
        // beak
        g.fillStyle = "#fb923c";
        g.beginPath();
        g.moveTo(14, 2); g.lineTo(24, 5); g.lineTo(14, 9);
        g.closePath();
        g.fill();
        // wing (flaps)
        const wing = dead ? 0.3 : Math.sin(t * 14) * 0.5;
        g.fillStyle = "#f59e0b";
        g.save();
        g.translate(-8, 2);
        g.rotate(wing * 0.6);
        rr(g, -8, -4, 14, 9, 4);
        g.fill();
        g.restore();
        g.restore();

        // score
        if (!dead) {
          g.font = '700 44px "Chakra Petch", sans-serif';
          g.textAlign = "center";
          g.fillStyle = "rgba(232,236,248,0.9)";
          g.shadowColor = "rgba(0,0,0,0.5)";
          g.shadowBlur = 8;
          g.fillText(String(score), LW / 2, 80);
          g.shadowBlur = 0;
        }
        g.restore();
      };

      function drawPipe(g, x, y, h, isTop) {
        if (h <= 0) return;
        g.fillStyle = "#3f6212";
        g.fillRect(x, y, 54, h);
        g.fillStyle = "#65a30d";
        g.fillRect(x + 5, y, 44, h);
        g.fillStyle = "rgba(255,255,255,0.14)";
        g.fillRect(x + 10, y, 8, h);
        // cap
        const capY = isTop ? y + h - 18 : y;
        g.fillStyle = "#84cc16";
        rr(g, x - 5, capY, 64, 18, 4);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.18)";
        rr(g, x - 2, capY + 3, 58, 5, 2);
        g.fill();
      }

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
