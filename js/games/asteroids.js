/* AGAME+ — Asteroids */
(() => {
  "use strict";
  const { sfx, rand, randi, clamp, shuffle } = AG;

  const ROCK_R = [0, 12, 22, 34];
  const ROCK_PTS = [0, 100, 50, 20];
  const ROCK_SPD = [0, 130, 95, 60];

  AG.register({
    id: "asteroids",
    title: "Asteroids",
    emoji: "🪨",
    category: "action",
    tagline: "Thrust, bank, and blast the rocks before they blast you. Splits get smaller, scores get bigger.",
    description:
      "Classic vector space survival. Rotate with A/D, thrust with W (or ↑), fire with space. Big rocks split into smaller, faster, pointier rocks.",
    controls: [["A / D or ← →", "rotate"], ["W or ↑", "thrust"], ["Space", "fire"], ["P", "pause"]],
    isNew: false,
    mount(shell) {
      let ship, rocks, shots, wave, score, lives, fireCd, invuln, over, stars1, stars2, shake, wavePending;

      function reset() {
        ship = {
          x: shell.w / 2,
          y: shell.h / 2,
          vx: 0,
          vy: 0,
          a: -Math.PI / 2,
          alive: true,
          thrust: false,
        };
        rocks = [];
        shots = [];
        wave = 0;
        score = 0;
        lives = 3;
        fireCd = 0;
        invuln = 2.2;
        over = false;
        shake = 0;
        wavePending = false;
        stars1 = Array.from({ length: 70 }, () => ({ x: rand(0, shell.w), y: rand(0, shell.h), s: rand(0.5, 1.2) }));
        stars2 = Array.from({ length: 40 }, () => ({ x: rand(0, shell.w), y: rand(0, shell.h), s: rand(1.2, 2.2) }));
        nextWave();
        shell.setScore(0, { bump: false });
      }

      const nextWave = () => {
        wave++;
        const n = Math.min(3 + wave, 11);
        for (let i = 0; i < n; i++) spawnRock(3, true);
        sfx.power();
      };

      const spawnRock = (size, away = false) => {
        let x, y;
        do {
          x = rand(0, shell.w);
          y = rand(0, shell.h);
        } while (away && ship && Math.hypot(x - ship.x, y - ship.y) < 180);
        const a = rand(0, Math.PI * 2);
        const sp = ROCK_SPD[size] * rand(0.7, 1.3);
        const verts = [];
        const n = randi(8, 11);
        for (let i = 0; i < n; i++) verts.push(rand(0.72, 1.05));
        rocks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size, rot: rand(0, 6.3), vr: rand(-1.6, 1.6), verts });
      };

      const splitRock = (r) => {
        if (r.size > 1) {
          for (let i = 0; i < 2; i++) {
            const a = rand(0, Math.PI * 2);
            const sp = ROCK_SPD[r.size - 1] * rand(0.8, 1.3);
            const verts = [];
            const n = randi(8, 11);
            for (let j = 0; j < n; j++) verts.push(rand(0.72, 1.05));
            rocks.push({ x: r.x, y: r.y, vx: r.vx * 0.35 + Math.cos(a) * sp, vy: r.vy * 0.35 + Math.sin(a) * sp, size: r.size - 1, rot: rand(0, 6.3), vr: rand(-2.2, 2.2), verts });
          }
        }
      };

      const die = () => {
        ship.alive = false;
        lives--;
        shake = 0.4;
        sfx.boom();
        const sx = ox2(ship.x), sy = oy2(ship.y);
        shell.burst(sx, sy, { color: "#fbbf24", count: 30, speed: 260 });
        if (lives <= 0) {
          over = true;
          setTimeoutSafe(() => shell.gameOver(score, { emoji: "🪨", lines: [`Wave reached: ${wave}`] }), 700);
        } else {
          setTimeoutSafe(() => {
            if (over) return;
            ship.x = shell.w / 2;
            ship.y = shell.h / 2;
            ship.vx = 0;
            ship.vy = 0;
            ship.a = -Math.PI / 2;
            ship.alive = true;
            invuln = 2.5;
          }, 1100);
        }
      };

      function setTimeoutSafe(fn, ms) {
        setTimeout(() => { if (!shell.destroyed) fn(); }, ms);
      }

      const ox2 = (x) => x; // identity; ship/rocks already in canvas coords
      const oy2 = (y) => y;

      shell._gameKey = (type, k) => {
        if (type === "down" && k === " ") fire();
      };

      const fire = () => {
        if (!ship.alive || fireCd > 0 || over) return;
        fireCd = 0.16;
        sfx.tick();
        shots.push({
          x: ship.x + Math.cos(ship.a) * 18,
          y: ship.y + Math.sin(ship.a) * 18,
          vx: Math.cos(ship.a) * 560 + ship.vx,
          vy: Math.sin(ship.a) * 560 + ship.vy,
          life: 1.0,
        });
      };

      const wrap = (o) => {
        if (o.x < -30) o.x = shell.w + 30;
        if (o.x > shell.w + 30) o.x = -30;
        if (o.y < -30) o.y = shell.h + 30;
        if (o.y > shell.h + 30) o.y = -30;
      };

      shell._gameStart = () => reset();

      shell._gameUpdate = (dt) => {
        if (over) return;
        if (shake > 0) shake -= dt;
        if (fireCd > 0) fireCd -= dt;
        if (invuln > 0) invuln -= dt;

        // ship controls
        if (ship.alive) {
          const rot = 4.2;
          if (shell.keys.has("a") || shell.keys.has("arrowleft")) ship.a -= rot * dt;
          if (shell.keys.has("d") || shell.keys.has("arrowright")) ship.a += rot * dt;
          ship.thrust = shell.keys.has("w") || shell.keys.has("arrowup");
          if (ship.thrust) {
            ship.vx += Math.cos(ship.a) * 420 * dt;
            ship.vy += Math.sin(ship.a) * 420 * dt;
            const sp = Math.hypot(ship.vx, ship.vy);
            if (sp > 420) { ship.vx *= 420 / sp; ship.vy *= 420 / sp; }
          }
          const fr = Math.pow(0.35, dt);
          ship.vx *= fr;
          ship.vy *= fr;
          ship.x += ship.vx * dt;
          ship.y += ship.vy * dt;
          wrap(ship);
        }

        // shots
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.life -= dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          wrap(s);
          if (s.life <= 0) shots.splice(i, 1);
        }

        // rocks
        for (const r of rocks) {
          r.x += r.vx * dt;
          r.y += r.vy * dt;
          r.rot += r.vr * dt;
          wrap(r);
        }

        // shot-rock collisions
        for (let i = rocks.length - 1; i >= 0; i--) {
          const r = rocks[i];
          const rr2 = ROCK_R[r.size];
          for (let j = shots.length - 1; j >= 0; j--) {
            const s = shots[j];
            if (Math.hypot(r.x - s.x, r.y - s.y) < rr2 + 3) {
              rocks.splice(i, 1);
              shots.splice(j, 1);
              splitRock(r);
              score += ROCK_PTS[r.size];
              shell.setScore(score);
              sfx.hit();
              shell.burst(r.x, r.y, { color: "#93a0c4", count: 10, speed: 140, color2: undefined });
              shell.popup(r.x, r.y, "+" + ROCK_PTS[r.size], "#e8ecf8");
              break;
            }
          }
        }

        // ship-rock collisions
        if (ship.alive && invuln <= 0) {
          for (const r of rocks) {
            if (Math.hypot(r.x - ship.x, r.y - ship.y) < ROCK_R[r.size] + 11) {
              die();
              break;
            }
          }
        }

        // wave clear
        if (rocks.length === 0 && !over && !wavePending) {
          wavePending = true;
          score += 500;
          shell.setScore(score);
          shell.popup(shell.w / 2, shell.h / 2, "WAVE CLEAR +500", "#a3e635");
          setTimeoutSafe(() => { wavePending = false; if (!over) nextWave(); }, 1400);
        }
      };

      shell._gameDraw = () => {
        const g = shell.ctx;
        let sx = 0, sy = 0;
        if (shake > 0) { sx = rand(-5, 5) * shake; sy = rand(-5, 5) * shake; }
        g.save();
        g.translate(sx, sy);

        g.fillStyle = "#04060e";
        g.fillRect(-10, -10, shell.w + 20, shell.h + 20);

        // stars
        for (const st of stars1) { g.fillStyle = "rgba(148,163,255,0.35)"; g.fillRect(st.x, st.y, st.s, st.s); }
        for (const st of stars2) { g.fillStyle = "rgba(148,163,255,0.6)"; g.fillRect(st.x, st.y, st.s, st.s); }

        // rocks
        g.strokeStyle = "#aab6dd";
        g.lineWidth = 2;
        g.shadowColor = "rgba(148,163,255,0.5)";
        g.shadowBlur = 8;
        for (const r of rocks) {
          g.save();
          g.translate(r.x, r.y);
          g.rotate(r.rot);
          g.beginPath();
          const n = r.verts.length;
          for (let i = 0; i <= n; i++) {
            const a = (i / n) * Math.PI * 2;
            const rad = ROCK_R[r.size] * r.verts[i % n];
            const px = Math.cos(a) * rad;
            const py = Math.sin(a) * rad;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.closePath();
          g.stroke();
          g.restore();
        }
        g.shadowBlur = 0;

        // shots
        g.fillStyle = "#fbbf24";
        g.shadowColor = "#fbbf24";
        g.shadowBlur = 8;
        for (const s of shots) { g.beginPath(); g.arc(s.x, s.y, 2.6, 0, Math.PI * 2); g.fill(); }
        g.shadowBlur = 0;

        // ship
        if (ship.alive) {
          const blink = invuln > 0 && Math.floor(invuln * 9) % 2 === 0;
          if (!blink) {
            g.save();
            g.translate(ship.x, ship.y);
            g.rotate(ship.a + Math.PI / 2);
            g.strokeStyle = "#e8ecf8";
            g.lineWidth = 2.4;
            g.shadowColor = "#22d3ee";
            g.shadowBlur = 12;
            g.beginPath();
            g.moveTo(0, -18);
            g.lineTo(13, 14);
            g.lineTo(0, 7);
            g.lineTo(-13, 14);
            g.closePath();
            g.stroke();
            g.shadowBlur = 0;
            if (ship.thrust) {
              g.strokeStyle = "#fbbf24";
              g.beginPath();
              g.moveTo(-5, 12);
              g.lineTo(0, 20 + rand(0, 7));
              g.lineTo(5, 12);
              g.stroke();
            }
            g.restore();
            if (invuln > 0) {
              g.strokeStyle = `rgba(34,211,238,${0.25 + 0.2 * Math.sin(invuln * 12)})`;
              g.lineWidth = 1.6;
              g.beginPath();
              g.arc(ship.x, ship.y, 24, 0, Math.PI * 2);
              g.stroke();
            }
          }
        }

        // HUD
        g.font = '600 13px "Chakra Petch", sans-serif';
        g.textAlign = "left";
        g.fillStyle = "rgba(148,163,255,0.7)";
        g.fillText(`WAVE ${wave}`, 16, 26);
        g.fillStyle = "#f472b6";
        let hearts = "";
        for (let i = 0; i < lives; i++) hearts += "▲ ";
        g.font = "13px sans-serif";
        g.fillText(hearts, 16, 46);
        g.restore();
      };

      shell.startOverlay();
    },
  });
})();
