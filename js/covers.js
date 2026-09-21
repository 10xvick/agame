/* ============================================================
   AGAME+ — procedural cover art (canvas, 640×360)
   ============================================================ */
const Covers = (() => {
  "use strict";

  const W = 640, H = 360;

  function make() {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return { c, g: c.getContext("2d") };
  }

  function bg(g, c1, c2, angle = 120) {
    const rad = (angle * Math.PI) / 180;
    const x = W / 2, y = H / 2;
    const r = Math.sqrt(W * W + H * H) / 2;
    const dx = Math.cos(rad) * r, dy = Math.sin(rad) * r;
    const grad = g.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }

  function dots(g, color, n = 90) {
    g.fillStyle = color;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      g.globalAlpha = 0.1 + rnd() * 0.5;
      g.beginPath();
      g.arc(rnd() * W, rnd() * H, rnd() * 2.2 + 0.6, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  function gridLines(g, color, step = 40) {
    g.strokeStyle = color;
    g.lineWidth = 1;
    for (let x = 0; x <= W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  }

  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function glow(g, color, blur = 30) {
    g.shadowColor = color;
    g.shadowBlur = blur;
  }

  function noGlow(g) { g.shadowColor = "transparent"; g.shadowBlur = 0; }

  function text(g, str, x, y, { size = 28, color = "#e8ecf8", weight = 700, font = '"Chakra Petch", sans-serif', align = "center" } = {}) {
    g.fillStyle = color;
    g.font = `${weight} ${size}px ${font}`;
    g.textAlign = align;
    g.textBaseline = "middle";
    g.fillText(str, x, y);
  }

  function vignette(g) {
    const grad = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(5,7,15,0.55)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }

  /* ---------------- individual covers ---------------- */

  const paints = {
    snake() {
      const { c, g } = make();
      bg(g, "#052e1b", "#064e3b", 135);
      gridLines(g, "rgba(163,230,53,0.10)", 40);
      dots(g, "rgba(163,230,53,0.35)");
      // snake path
      const pts = [[70, 280], [150, 280], [150, 190], [240, 190], [240, 100], [330, 100], [330, 190], [420, 190], [420, 280], [520, 280]];
      g.lineCap = "round";
      g.lineJoin = "round";
      g.lineWidth = 30;
      g.strokeStyle = "#16a34a";
      glow(g, "#4ade80", 26);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
      g.stroke();
      noGlow(g);
      g.lineWidth = 16;
      g.strokeStyle = "#4ade80";
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
      g.stroke();
      // head
      g.fillStyle = "#86efac";
      g.beginPath();
      g.arc(520, 280, 20, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#052e1b";
      g.beginPath(); g.arc(527, 273, 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(527, 288, 4, 0, Math.PI * 2); g.fill();
      // food
      glow(g, "#f87171", 18);
      g.fillStyle = "#f87171";
      g.beginPath(); g.arc(560, 130, 13, 0, Math.PI * 2); g.fill();
      noGlow(g);
      vignette(g);
      return c;
    },

    tetris() {
      const { c, g } = make();
      bg(g, "#1e1044", "#0e1226", 120);
      gridLines(g, "rgba(148,163,255,0.08)", 48);
      const colors = ["#22d3ee", "#f472b6", "#fbbf24", "#a3e635", "#c084fc", "#fb923c"];
      const S = 46;
      const shapes = [
        [[0, 0], [1, 0], [2, 0], [3, 0]],
        [[0, 0], [1, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [2, 0], [1, 1]],
        [[0, 0], [0, 1], [0, 2], [0, 3]],
        [[1, 0], [2, 0], [0, 1], [1, 1]],
      ];
      const pos = [
        [90, 250], [330, 290], [500, 210], [180, 90], [420, 70],
      ];
      shapes.forEach((sh, i) => {
        const [px, py] = pos[i];
        sh.forEach(([sx, sy]) => {
          glow(g, colors[i], 14);
          g.fillStyle = colors[i];
          rr(g, px + sx * (S + 4), py + sy * (S + 4), S, S, 8);
          g.fill();
          noGlow(g);
          g.fillStyle = "rgba(255,255,255,0.22)";
          rr(g, px + sx * (S + 4) + 5, py + sy * (S + 4) + 5, S - 10, 10, 5);
          g.fill();
        });
      });
      dots(g, "rgba(192,132,252,0.4)");
      vignette(g);
      return c;
    },

    breakout() {
      const { c, g } = make();
      bg(g, "#081a33", "#0c0f22", 90);
      const cols = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#22d3ee", "#818cf8"];
      const bw = 74, bh = 22, gap = 10, ox = (W - (8 * bw + 7 * gap)) / 2;
      for (let r = 0; r < 5; r++) {
        for (let i = 0; i < 8; i++) {
          glow(g, cols[r], 8);
          g.fillStyle = cols[r];
          rr(g, ox + i * (bw + gap), 48 + r * (bh + gap), bw, bh, 6);
          g.fill();
          noGlow(g);
        }
      }
      // paddle
      glow(g, "#22d3ee", 20);
      g.fillStyle = "#22d3ee";
      rr(g, W / 2 - 60, 296, 120, 14, 7);
      g.fill();
      noGlow(g);
      // ball + trail
      g.strokeStyle = "rgba(255,255,255,0.35)";
      g.lineWidth = 5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(W / 2 - 40, 260);
      g.quadraticCurveTo(W / 2 - 10, 210, W / 2 + 50, 170);
      g.stroke();
      glow(g, "#ffffff", 16);
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(W / 2 + 55, 168, 9, 0, Math.PI * 2);
      g.fill();
      noGlow(g);
      vignette(g);
      return c;
    },

    pong() {
      const { c, g } = make();
      bg(g, "#05070f", "#0b1226", 90);
      g.strokeStyle = "rgba(148,163,255,0.35)";
      g.lineWidth = 3;
      g.setLineDash([14, 18]);
      g.beginPath(); g.moveTo(W / 2, 30); g.lineTo(W / 2, H - 30); g.stroke();
      g.setLineDash([]);
      g.strokeStyle = "rgba(148,163,255,0.25)";
      g.lineWidth = 4;
      g.strokeRect(30, 30, W - 60, H - 60);
      glow(g, "#22d3ee", 18);
      g.fillStyle = "#22d3ee";
      rr(g, 60, 150, 14, 84, 7); g.fill();
      noGlow(g);
      glow(g, "#f472b6", 18);
      g.fillStyle = "#f472b6";
      rr(g, W - 74, 120, 14, 84, 7); g.fill();
      noGlow(g);
      glow(g, "#ffffff", 14);
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(W / 2 - 30, 210, 10, 0, Math.PI * 2); g.fill();
      noGlow(g);
      text(g, "7 : 5", W / 2, 66, { size: 26, color: "rgba(232,236,248,0.5)" });
      vignette(g);
      return c;
    },

    asteroids() {
      const { c, g } = make();
      bg(g, "#03050c", "#0a0f22", 160);
      dots(g, "rgba(148,163,255,0.55)", 140);
      // asteroids
      const rock = (x, y, r, rot, n = 9) => {
        g.strokeStyle = "#93a0c4";
        g.lineWidth = 2.5;
        g.beginPath();
        for (let i = 0; i <= n; i++) {
          const a = rot + (i / n) * Math.PI * 2;
          const rr2 = r * (0.72 + 0.3 * Math.sin(i * 2.7 + x));
          const px = x + Math.cos(a) * rr2;
          const py = y + Math.sin(a) * rr2;
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
      };
      rock(150, 100, 46, 0.4);
      rock(470, 90, 30, 1.8);
      rock(540, 250, 52, 2.6);
      rock(250, 280, 26, 0.9);
      // ship
      g.save();
      g.translate(330, 210);
      g.rotate(-0.5);
      glow(g, "#22d3ee", 20);
      g.strokeStyle = "#e8ecf8";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(26, 0); g.lineTo(-18, -16); g.lineTo(-10, 0); g.lineTo(-18, 16); g.closePath();
      g.stroke();
      noGlow(g);
      g.fillStyle = "#fbbf24";
      g.beginPath();
      g.moveTo(-12, 0); g.lineTo(-30 - Math.random() * 14, 0);
      g.lineTo(-12, 6); g.closePath();
      g.fill();
      g.restore();
      // bullets
      g.fillStyle = "#fff";
      [[380, 180], [410, 168], [440, 156]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); });
      vignette(g);
      return c;
    },

    flappy() {
      const { c, g } = make();
      bg(g, "#0b2a4a", "#0e4a6b", 90);
      // pipes
      const pipe = (x, topH, botY) => {
        glow(g, "#a3e635", 10);
        g.fillStyle = "#3f6212";
        g.fillRect(x, 0, 54, topH);
        g.fillRect(x, botY, 54, H - botY);
        g.fillStyle = "#65a30d";
        g.fillRect(x + 4, 0, 46, topH);
        g.fillRect(x + 4, botY, 46, H - botY);
        g.fillStyle = "#84cc16";
        rr(g, x - 6, topH - 20, 66, 20, 4); g.fill();
        rr(g, x - 6, botY, 66, 20, 4); g.fill();
        noGlow(g);
      };
      pipe(90, 120, 250);
      pipe(300, 70, 210);
      pipe(510, 150, 300);
      // bird
      const bx = 210, by = 160;
      glow(g, "#fbbf24", 22);
      g.fillStyle = "#fbbf24";
      g.beginPath(); g.arc(bx, by, 22, 0, Math.PI * 2); g.fill();
      noGlow(g);
      g.fillStyle = "#fde68a";
      g.beginPath(); g.arc(bx, by + 8, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(bx + 8, by - 6, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#0a0d18";
      g.beginPath(); g.arc(bx + 10, by - 6, 3.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fb923c";
      g.beginPath(); g.moveTo(bx + 20, by + 2); g.lineTo(bx + 34, by + 6); g.lineTo(bx + 20, by + 11); g.closePath(); g.fill();
      // clouds
      g.fillStyle = "rgba(255,255,255,0.14)";
      [[60, 40, 34], [560, 60, 28], [420, 320, 30], [180, 320, 26]].forEach(([x, y, r]) => {
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.arc(x + r, y + 6, r * 0.75, 0, Math.PI * 2); g.fill();
      });
      vignette(g);
      return c;
    },

    "2048"() {
      const { c, g } = make();
      bg(g, "#1c1917", "#0f172a", 120);
      const S = 118, gap = 14;
      const ox = (W - (4 * S + 3 * gap)) / 2, oy = (H - (4 * S + 3 * gap)) / 2;
      const tiles = [
        [0, 0, 2], [1, 0, 4], [2, 0, 8], [3, 0, 16],
        [0, 1, 32], [2, 1, 128], [3, 1, 64],
        [1, 2, 256], [0, 2, 64], [3, 2, 2048],
        [1, 3, 512], [2, 3, 1024], [0, 3, 128],
      ];
      const palette = {
        2: "#e7d9c8", 4: "#e8d3b9", 8: "#f2b97d", 16: "#f0a460", 32: "#ef9249", 64: "#ee7f3d",
        128: "#f6e058", 256: "#f8d84b", 512: "#f9cf3d", 1024: "#faf048", 2048: "#e8f24a",
      };
      for (const [cx, cy, v] of tiles) {
        const x = ox + cx * (S + gap), y = oy + cy * (S + gap);
        glow(g, v >= 128 ? "rgba(250,240,72,0.8)" : "rgba(255,255,255,0.25)", v >= 128 ? 26 : 10);
        g.fillStyle = palette[v];
        rr(g, x, y, S, S, 14);
        g.fill();
        noGlow(g);
        const size = v < 100 ? 44 : v < 1000 ? 36 : 27;
        text(g, String(v), x + S / 2, y + S / 2 + 3, { size, color: v < 4 ? "#6b5d4f" : "#fff" });
      }
      vignette(g);
      return c;
    },

    memory() {
      const { c, g } = make();
      bg(g, "#172554", "#0e1226", 110);
      dots(g, "rgba(96,165,250,0.3)");
      const S = 110, gap = 18;
      const ox = (W - (4 * S + 3 * gap)) / 2, oy = (H - (2 * S + gap)) / 2;
      const emoji = ["🐸", "", "🎧", "⚽"];
      for (let i = 0; i < 8; i++) {
        const cx = i % 4, cy = Math.floor(i / 4);
        const x = ox + cx * (S + gap), y = oy + cy * (S + gap);
        if (i === 1 || i === 6) {
          glow(g, "#22d3ee", 16);
          g.fillStyle = "#12233f";
          rr(g, x, y, S, S, 16); g.fill();
          noGlow(g);
          g.strokeStyle = "rgba(34,211,238,0.6)";
          g.lineWidth = 2;
          rr(g, x, y, S, S, 16); g.stroke();
          text(g, ["🚀", ""][i === 1 ? 0 : 1], x + S / 2, y + S / 2 + 4, { size: 52, font: "sans-serif" });
        } else {
          g.fillStyle = "#1c2c55";
          rr(g, x, y, S, S, 16); g.fill();
          g.strokeStyle = "rgba(148,163,255,0.25)";
          g.lineWidth = 2;
          rr(g, x, y, S, S, 16); g.stroke();
          text(g, "A⁺", x + S / 2, y + S / 2 + 2, { size: 34, color: "rgba(148,163,255,0.4)" });
        }
      }
      vignette(g);
      return c;
    },

    simon() {
      const { c, g } = make();
      bg(g, "#0b0f1f", "#101736", 130);
      const S = 150, gap = 18;
      const ox = (W - (2 * S + gap)) / 2, oy = (H - (2 * S + gap)) / 2;
      const cols = ["#f87171", "#a3e635", "#fbbf24", "#22d3ee"];
      const lit = [false, true, false, false];
      for (let i = 0; i < 4; i++) {
        const x = ox + (i % 2) * (S + gap), y = oy + Math.floor(i / 2) * (S + gap);
        if (lit[i]) glow(g, cols[i], 40);
        g.fillStyle = cols[i];
        g.globalAlpha = lit[i] ? 1 : 0.32;
        rr(g, x, y, S, S, 26);
        g.fill();
        g.globalAlpha = 1;
        noGlow(g);
      }
      vignette(g);
      return c;
    },

    minesweeper() {
      const { c, g } = make();
      bg(g, "#101728", "#0a0f1f", 90);
      const S = 56, gap = 6;
      const cols = 9, rows = 5;
      const ox = (W - (cols * S + (cols - 1) * gap)) / 2, oy = (H - (rows * S + (rows - 1) * gap)) / 2;
      const colors = ["", "#7dd3fc", "#a3e635", "#f87171", "#c4b5fd", "#fbbf24", "#2dd4bf"];
      const open = [
        [1, 1, 0, 1, 1, 1, 0, 1, 1],
        [1, 2, 0, 2, 1, 1, 0, 2, 1],
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [1, 2, 1, 1, 1, 1, 1, 2, 1],
        [1, 1, 0, 1, 1, 0, 1, 1, 1],
      ];
      for (let r = 0; r < rows; r++) {
        for (let cc = 0; cc < cols; cc++) {
          const x = ox + cc * (S + gap), y = oy + r * (S + gap);
          const v = open[r][cc];
          if (v === 0) {
            g.fillStyle = "#1b2440";
            rr(g, x, y, S, S, 9); g.fill();
          } else {
            g.fillStyle = "rgba(148,163,255,0.07)";
            rr(g, x, y, S, S, 9); g.fill();
            text(g, String(v), x + S / 2, y + S / 2 + 2, { size: 30, color: colors[v] });
          }
        }
      }
      // a revealed mine
      const mx = ox + 2 * (S + gap), my = oy + 4 * (S + gap);
      g.fillStyle = "rgba(248,113,113,0.25)";
      rr(g, mx, my, S, S, 9); g.fill();
      text(g, "💣", mx + S / 2, my + S / 2 + 2, { size: 30, font: "sans-serif" });
      vignette(g);
      return c;
    },

    reaction() {
      const { c, g } = make();
      bg(g, "#052e1b", "#05261b", 90);
      glow(g, "#a3e635", 50);
      g.fillStyle = "#a3e635";
      rr(g, W / 2 - 170, 60, 340, 150, 20); g.fill();
      noGlow(g);
      text(g, "GO!", W / 2, 135, { size: 72, color: "#052e1b" });
      text(g, "212 ms", W / 2, 258, { size: 44, color: "#e8ecf8" });
      text(g, "average · 5 rounds", W / 2, 302, { size: 18, color: "#93a0c4", weight: 500 });
      vignette(g);
      return c;
    },

    whack() {
      const { c, g } = make();
      bg(g, "#292013", "#171207", 100);
      dots(g, "rgba(251,191,36,0.25)");
      const S = 120, gap = 22;
      const ox = (W - (3 * S + 2 * gap)) / 2, oy = (H - (2 * S + gap)) / 2;
      for (let i = 0; i < 6; i++) {
        const x = ox + (i % 3) * (S + gap), y = oy + Math.floor(i / 3) * (S + gap);
        g.fillStyle = "rgba(0,0,0,0.5)";
        g.beginPath(); g.ellipse(x + S / 2, y + S / 2 + S * 0.22, S * 0.42, S * 0.2, 0, 0, Math.PI * 2); g.fill();
        if (i === 0 || i === 4) {
          text(g, "🐹", x + S / 2, y + S / 2 - 4, { size: 64, font: "sans-serif" });
        } else if (i === 2) {
          text(g, "🌟", x + S / 2, y + S / 2 - 4, { size: 58, font: "sans-serif" });
        }
      }
      // mallet
      g.save();
      g.translate(470, 150);
      g.rotate(0.7);
      g.strokeStyle = "#a16207";
      g.lineWidth = 14;
      g.lineCap = "round";
      g.beginPath(); g.moveTo(0, 0); g.lineTo(40, -90); g.stroke();
      g.fillStyle = "#7c2d12";
      rr(g, -34, -124, 78, 46, 12); g.fill();
      g.restore();
      vignette(g);
      return c;
    },

    typerush() {
      const { c, g } = make();
      bg(g, "#0c1428", "#0a0f1f", 110);
      gridLines(g, "rgba(34,211,238,0.07)", 32);
      const word = "QUICK";
      const S = 74, gap = 12;
      const ox = (W - (word.length * S + (word.length - 1) * gap)) / 2;
      word.split("").forEach((ch, i) => {
        const x = ox + i * (S + gap), y = 120;
        const done = i < 2;
        glow(g, done ? "#a3e635" : "rgba(34,211,238,0.5)", done ? 22 : 10);
        g.fillStyle = done ? "rgba(163,230,53,0.18)" : "#111b33";
        rr(g, x, y, S, S, 14); g.fill();
        noGlow(g);
        g.strokeStyle = done ? "rgba(163,230,53,0.8)" : "rgba(148,163,255,0.3)";
        g.lineWidth = 2;
        rr(g, x, y, S, S, 14); g.stroke();
        text(g, ch, x + S / 2, y + S / 2 + 4, { size: 40, color: done ? "#a3e635" : "#93a0c4" });
      });
      text(g, "⌨ type as fast as you can", W / 2, 250, { size: 20, color: "#93a0c4", weight: 500 });
      text(g, "142 WPM", W / 2, 296, { size: 30, color: "#22d3ee" });
      vignette(g);
      return c;
    },

    chroma() {
      const { c, g } = make();
      bg(g, "#0b0f1f", "#101a33", 120);
      const S = 88, gap = 12;
      const ox = (W - (4 * S + 3 * gap)) / 2, oy = (H - (3 * S + 2 * gap)) / 2;
      for (let i = 0; i < 12; i++) {
        const x = ox + (i % 4) * (S + gap), y = oy + Math.floor(i / 4) * (S + gap);
        const odd = i === 7;
        g.fillStyle = odd ? "#312e81" : "#27256b";
        if (odd) { glow(g, "#818cf8", 24); }
        rr(g, x, y, S, S, 16); g.fill();
        noGlow(g);
      }
      text(g, "find the odd one out", W / 2, H - 26, { size: 16, color: "#5d6a94", weight: 500 });
      vignette(g);
      return c;
    },

    lightsout() {
      const { c, g } = make();
      bg(g, "#0b0f1f", "#0d1120", 100);
      const S = 64, gap = 12;
      const cols = 5, rows = 4;
      const ox = (W - (cols * S + (cols - 1) * gap)) / 2, oy = (H - (rows * S + (rows - 1) * gap)) / 2;
      const on = [
        [1, 0, 1, 0, 1],
        [0, 1, 1, 1, 0],
        [0, 1, 1, 1, 0],
        [1, 0, 1, 0, 1],
      ];
      for (let r = 0; r < rows; r++) {
        for (let cc = 0; cc < cols; cc++) {
          const x = ox + cc * (S + gap), y = oy + r * (S + gap);
          if (on[r][cc]) {
            glow(g, "#fbbf24", 30);
            g.fillStyle = "#fcd34d";
            rr(g, x, y, S, S, 16); g.fill();
            noGlow(g);
          } else {
            g.fillStyle = "#141b33";
            rr(g, x, y, S, S, 16); g.fill();
            g.strokeStyle = "rgba(148,163,255,0.2)";
            g.lineWidth = 2;
            rr(g, x, y, S, S, 16); g.stroke();
          }
        }
      }
      vignette(g);
      return c;
    },

    tictactoe() {
      const { c, g } = make();
      bg(g, "#101736", "#0a0f1f", 115);
      const S = 118, gap = 12;
      const ox = (W - (3 * S + 2 * gap)) / 2, oy = (H - (3 * S + 2 * gap)) / 2;
      for (let i = 0; i < 9; i++) {
        const x = ox + (i % 3) * (S + gap), y = oy + Math.floor(i / 3) * (S + gap);
        g.fillStyle = "#141b33";
        rr(g, x, y, S, S, 18); g.fill();
        g.strokeStyle = "rgba(148,163,255,0.22)";
        g.lineWidth = 2;
        rr(g, x, y, S, S, 18); g.stroke();
      }
      const cell = (i) => [ox + (i % 3) * (S + gap) + S / 2, oy + Math.floor(i / 3) * (S + gap) + S / 2];
      const mark = (i, t) => {
        const [x, y] = cell(i);
        g.lineWidth = 10;
        g.lineCap = "round";
        if (t === "x") {
          glow(g, "#22d3ee", 18);
          g.strokeStyle = "#22d3ee";
          g.beginPath(); g.moveTo(x - 26, y - 26); g.lineTo(x + 26, y + 26); g.stroke();
          g.beginPath(); g.moveTo(x + 26, y - 26); g.lineTo(x - 26, y + 26); g.stroke();
        } else {
          glow(g, "#f472b6", 18);
          g.strokeStyle = "#f472b6";
          g.beginPath(); g.arc(x, y, 28, 0, Math.PI * 2); g.stroke();
        }
        noGlow(g);
      };
      mark(0, "x"); mark(1, "o"); mark(2, "x");
      mark(3, "o"); mark(4, "x");
      mark(7, "o"); mark(8, "x");
      vignette(g);
      return c;
    },
  };

  function draw(id, canvas) {
    const painter = paints[id];
    if (!painter) return false;
    const { c } = painter();
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext("2d");
    g.drawImage(c, 0, 0);
    return true;
  }

  return { draw };
})();

window.Covers = Covers;
