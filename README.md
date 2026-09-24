# AGAME+

A free browser arcade — 16 hand-built games in vanilla JS + canvas. No frameworks, no build step, no downloads, no trackers.

Built as a higher-quality take on classic game-portal sites (like agame.com): every game is an original implementation written from scratch, with crisp vector graphics, synthesized sound effects (WebAudio, zero audio assets), persistent high scores (localStorage), and full keyboard + touch support.

## Play

Any static file server works:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

or `npx serve .`, GitHub Pages, Netlify, Cloudflare Pages, …

## The games

| Game | Category | Notes |
| --- | --- | --- |
| Neon Snake | Arcade | Speeds up per apple, particle bursts, swipe on mobile |
| Tetris | Arcade | 7-bag randomizer, hold, ghost piece, next ×3, line multipliers |
| Breakout | Arcade | Multi-hit bricks, power-ups (wide paddle, multiball, slow, life) |
| Neon Pong | Arcade | Adaptive AI, ball speeds up per hit, first to 7 |
| Asteroids | Action | Vector graphics, splitting rocks, waves, respawn shield |
| Whack-a-Mole | Action | 30s rounds, gold moles +25, bombs −20, ramps up in speed |
| 2048 | Puzzle | Smooth slide/merge animations, "keep going" after 2048 |
| Memory Match | Puzzle | 8 pairs, 3D card flips, time + moves scoring |
| Simon Says | Reflex | Real tones per pad, sequence playback you can watch/record |
| Reaction Test | Reflex | 5 rounds, false-start detection, avg + best |
| Type Rush | Reflex | 45s typing gauntlet, typos cost 2s, WPM readout |
| Chroma | Puzzle | 10 rounds, shrinking delta + timer, streak multipliers |
| Minesweeper | Puzzle | First click always safe, flood fill, flag mode for touch |
| Lights Out | Puzzle | Guaranteed-solvable scrambles, par bonus |
| Tic-Tac-Toe | Strategy | Minimax AI — it can draw, but never lose |
| Flappy Block | Arcade | One-tap flappy, pipes get tighter and faster |

## Architecture

```
index.html          — single page shell
css/style.css       — design system (dark neon theme)
js/common.js        — engine: storage, WebAudio sfx synth, game Shell, registry
js/covers.js        — procedural canvas cover art for every game card
js/main.js          — hash router, home page (cozy shelf, search, categories, grid)
js/games/*.js       — 16 self-registering game modules
scripts/verify.mjs  — functional smoke verifier used before presenting a preview
skills/verify-before-presenting/SKILL.md — repeatable pre-presentation checklist
```

Each game registers `{ id, title, category, controls, mount(shell) }`. The `Shell` provides the HUD (score/best), start & game-over overlays, the rAF loop, canvas + dpr sizing, pause/resume (including auto-pause on tab blur), particles, and a touch control pad. Games stay framework-free and self-contained.

## Verify before presenting

Install the small test dependency and run the functional smoke verifier before presenting a UI change:

```bash
npm install
npm run verify
```

The verifier parses every JavaScript file, mounts the home shelf in a DOM harness, checks the canvas cards and bottom navigation, exercises search and category filtering, opens the Snake route, and presses the primary play button. It is a functional check, not a pixel-level visual test; use a real browser pass at desktop and mobile sizes for final visual verification.

## Notes

- **High scores** are per-browser (`localStorage`), keyed per game.
- **Sound** is fully synthesized with WebAudio — toggle with the speaker icon or `M`.
- **Pause** with `Esc`/`P`, **restart** with `R` (where sensible), **fullscreen** from the player header.
- Not affiliated with any existing "agame" website; this is a fan-made demo portal.
