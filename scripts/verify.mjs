#!/usr/bin/env node
/**
 * AGAME smoke verifier.
 *
 * This intentionally runs the app in a DOM harness rather than only parsing
 * source files. It catches broken imports, router failures, missing canvases,
 * and dead primary actions before a preview is presented.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const checks = [];

function check(label, condition, detail = "") {
  if (condition) {
    checks.push(`PASS  ${label}`);
    return;
  }
  failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  checks.push(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
}

function wait(ms = 20) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function installCanvasAndBrowserStubs(dom) {
  const { window } = dom;
  const noop = () => {};
  const gradient = () => ({ addColorStop: noop });
  const context = new Proxy({}, {
    get(target, property) {
      if (property === "createLinearGradient" || property === "createRadialGradient") return gradient;
      if (property === "measureText") return () => ({ width: 20 });
      if (!(property in target)) target[property] = noop;
      return target[property];
    },
  });

  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.location = window.location;
  globalThis.localStorage = window.localStorage;
  window.devicePixelRatio = 1;
  window.matchMedia = () => ({ matches: false, addListener: noop, removeListener: noop });
  globalThis.matchMedia = window.matchMedia;
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = noop;
  globalThis.requestAnimationFrame = window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame;
  window.scrollTo = noop;

  class ResizeObserver {
    constructor() {}
    observe() {}
    disconnect() {}
  }
  class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserver;
  window.IntersectionObserver = IntersectionObserver;
  globalThis.ResizeObserver = ResizeObserver;
  globalThis.IntersectionObserver = IntersectionObserver;

  window.HTMLCanvasElement.prototype.getContext = () => context;
  window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 640, bottom: 420, width: 640, height: 420,
  });
  window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return { left: 0, top: 0, right: 640, bottom: 420, width: 640, height: 420 };
  };
}

function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(path);
    return entry.name.endsWith(".js") ? [path] : [];
  });
}

function checkSyntax() {
  for (const file of jsFiles(join(ROOT, "js"))) {
    try {
      execFileSync(process.execPath, ["--check", file], { cwd: ROOT, stdio: "pipe" });
      check(`syntax ${file.replace(`${ROOT}/`, "")}`, true);
    } catch (error) {
      check(`syntax ${file.replace(`${ROOT}/`, "")}`, false, error.stderr?.toString().trim() || "parse error");
    }
  }
}

async function runDomSmoke() {
  const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
    url: "http://localhost:8000/#/",
    pretendToBeVisual: true,
  });
  const errors = [];
  dom.window.addEventListener("error", (event) => errors.push(event.error || event.message));
  dom.window.addEventListener("unhandledrejection", (event) => errors.push(event.reason));
  installCanvasAndBrowserStubs(dom);

  // These globals are properties on window in the browser. Expose them on
  // globalThis as well so the same modules can be smoke-tested under Node.
  await import(pathToFileURL(join(ROOT, "js/common.js")).href);
  globalThis.AG = window.AG;
  await import(pathToFileURL(join(ROOT, "js/covers.js")).href);
  globalThis.Covers = window.Covers;
  await import(pathToFileURL(join(ROOT, "js/main.js")).href);
  await wait();

  const app = document.querySelector("#app");
  check("home renders", Boolean(app.querySelector(".collection-screen")));
  check("home has game cards", app.querySelectorAll(".game-grid .card").length === 16, `found ${app.querySelectorAll(".game-grid .card").length}`);
  check("home has canvas cards", app.querySelectorAll("canvas").length === 16, `found ${app.querySelectorAll("canvas").length}`);
  check("home has bottom navigation", Boolean(app.querySelector(".mobile-nav")));
  check("home has no runtime errors", errors.length === 0, errors.map((error) => error?.stack || error).join(" | "));

  const search = app.querySelector("#search-m");
  search.value = "snake";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await wait();
  check("search filters cards", app.querySelectorAll(".game-grid .card").length === 1, `found ${app.querySelectorAll(".game-grid .card").length}`);
  check("search finds Neon Snake", app.querySelector(".game-grid .card-title")?.textContent === "Neon Snake");

  // Return to the complete shelf and verify a category tab is interactive.
  search.value = "";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await wait();
  app.querySelector('.mood-tab[data-cat="puzzle"]')?.click();
  await wait();
  check("category tab updates shelf", app.querySelector(".shelf-section-head h2")?.textContent === "Puzzle");

  // Exercise the router and the primary play action.
  window.location.hash = "#/play/snake";
  window.dispatchEvent(new window.HashChangeEvent("hashchange"));
  await wait();
  check("game route renders", Boolean(app.querySelector(".player")));
  check("game route has canvas", Boolean(app.querySelector("canvas.game-canvas")));
  check("game route has start overlay", Boolean(app.querySelector('.overlay [data-ov="primary"]')));
  app.querySelector('.overlay [data-ov="primary"]')?.click();
  await wait();
  check("play button starts game", app.querySelector(".overlay")?.classList.contains("hidden") === true);
  check("no errors after game start", errors.length === 0, errors.map((error) => error?.stack || error).join(" | "));
}

checkSyntax();
await runDomSmoke();

for (const line of checks) console.log(line);
if (failures.length) {
  console.error(`\n${failures.length} verification failure(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nVerification passed: ${checks.length} checks.`);
}
