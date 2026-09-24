# Verify before presenting

Use this skill for every web UI or game change before telling the user that a preview is ready or presenting a deliverable.

## Goal

Do not confuse “the server returned HTML” with “the product works.” A presentable change must pass both functional smoke checks and a visual browser check when a browser is available.

## Required workflow

1. **Read the app entry point and route map.** Identify the first screen, at least one primary interaction, and one important secondary route.
2. **Run static checks.** Parse every changed JavaScript file and run the repository’s test/lint commands if they exist.
3. **Start the app on `0.0.0.0`.** Use the process tool for a persistent preview server. Confirm the expected port is listening.
4. **Check the real browser console.** Open the preview at desktop and mobile-sized viewports. Record uncaught exceptions, unhandled promise rejections, failed module requests, and failed asset requests.
5. **Smoke-test the first screen.** Verify that the intended shell, primary content, interactive controls, and at least one canvas are present.
6. **Exercise the critical path.** For a game UI this means: search/filter or category navigation, opening a game route, pressing the primary start/play button, and confirming the game canvas/overlay state changes.
7. **Check responsive layout.** Inspect at least one narrow viewport around 375×812 and one desktop viewport around 1440×900. Look for clipping, overlap, unreadable text, fixed-nav collisions, and stretched canvas content.
8. **Only present after all checks pass.** If the real browser cannot be installed or opened, explicitly say visual verification is unavailable; do not claim the preview is verified. Use the DOM smoke fallback, but treat it as functional-only.

## Repository command

This repository includes a functional smoke verifier:

```bash
npm install
npm run verify
```

`npm run verify` parses every JavaScript file, mounts the home route in a DOM harness, checks the shelf and canvas count, exercises search and category filtering, opens the Snake route, and presses the primary play button. It catches route/import/runtime regressions but cannot validate pixels.

## Browser verification

When Playwright or another browser driver is available, also run a browser pass. Capture a screenshot for both target viewports and fail on `console.error`, `pageerror`, failed requests, or missing primary selectors. Keep screenshots outside Git or in an ignored temp directory.

Example checklist:

```text
[ ] home screen is visible
[ ] no console/page errors
[ ] no failed JS/CSS/image requests
[ ] primary CTA changes the route/state
[ ] category/search interaction changes visible content
[ ] game canvas is visible and correctly sized
[ ] mobile layout has no horizontal overflow
[ ] desktop layout has no overlap
```

## Reporting

In the final response, report what was actually checked. Say “functional smoke test passed” and “visual browser check passed” separately; never imply one proves the other.
