/* AGAME+ — Type Rush */
(() => {
  "use strict";
  const { sfx, choice } = AG;

  const WORDS = (
    "quick silent bright hidden rapid clever noble fierce golden shadow river stone mountain forest ocean sky cloud wind rain storm thunder lightning fire water earth rock sand dust spark flame ember glow dawn dusk night day morning evening summer winter spring autumn harvest journey travel wander explore discover imagine create destroy build break fix mend grow fade shift drift float sink rise fall leap jump dance spin twist bend fold crush grind split tear weave knot rope chain link bond fuse merge split code debug compile runtime syntax buffer matrix vector tensor scalar pixel vertex polygon mesh shader kernel thread process daemon socket packet router proxy cache queue stack heap array pointer memory storage cache login token signal noise pulse wave orbit planet galaxy comet asteroid meteor solar lunar tidal gravity friction impact collision velocity momentum inertia energy matter atom ion molecule crystal mineral fossil volcano glacier desert jungle canyon cliff valley meadow prairie steppe tundra polar arctic tropical equator tropical"
  ).split(" ");

  const DURATION = 45;

  AG.register({
    id: "typerush",
    title: "Type Rush",
    emoji: "⌨️",
    category: "reflex",
    tagline: "Words fall, you type. 45 seconds. Mistakes cost you 2 whole seconds.",
    description:
      "A pure typing-speed gauntlet. Type each word from the top of your screen — no backspace forgiveness beyond the current word, and typos shave 2s off the clock.",
    controls: [["type", "the current word"], ["Backspace", "fix current word"]],
    isNew: true,
    mount(shell) {
      // this game consumes raw letters — don't let global hotkeys eat them
      shell._blockKeys = new Set(["p", "m", "r"]);
      let word, typed, words, timeLeft, over, running, dom, wrapEl;

      dom = document.createElement("div");
      dom.className = "dom-game";
      shell.frame.appendChild(dom);

      function reset() {
        word = choice(WORDS);
        typed = 0;
        words = 0;
        timeLeft = DURATION;
        over = false;
        running = true;
        dom.innerHTML = `
          <div class="dg-inner">
            <div class="type-wrap" id="wrap">
              <div class="type-bar">
                <span class="dg-chip">⏱ <b id="tm">${DURATION}</b></span>
                <span class="dg-chip">Words <b id="wd">0</b></span>
              </div>
              <div class="type-words" id="tw"></div>
              <div class="type-progress"><div class="fill" id="pf"></div></div>
            </div>
          </div>`;
        wrapEl = dom.querySelector("#wrap");
        render();
        shell.setScore(0, { bump: false });
      }

      const nextWord = () => {
        do { word = choice(WORDS); } while (word.length < 3);
        typed = 0;
        render();
      };

      const render = () => {
        const el = dom.querySelector("#tw");
        if (!el) return;
        el.innerHTML =
          `<span class="t-correct">${word.slice(0, typed)}</span>` +
          `<span>${word[typed] || ""}</span>` +
          `<span class="t-cursor"></span>` +
          `<span class="t-rest">${word.slice(typed + 1)}</span>`;
        dom.querySelector("#wd").textContent = words;
        dom.querySelector("#pf").style.width = (timeLeft / DURATION) * 100 + "%";
      };

      const press = (ch, isBack) => {
        if (!running || over) return;
        if (isBack) {
          if (typed > 0) { typed--; sfx.tick(); render(); }
          return;
        }
        if (ch.length !== 1 || !/[a-z]/i.test(ch)) return;
        if (ch.toLowerCase() === word[typed]) {
          typed++;
          if (typed >= word.length) {
            words++;
            shell.setScore(words);
            sfx.score(words);
            nextWord();
          } else {
            render();
          }
        } else {
          // wrong key
          timeLeft = Math.max(0, timeLeft - 2);
          sfx.hit();
          wrapEl.classList.remove("shake");
          void wrapEl.offsetWidth;
          wrapEl.classList.add("shake");
          render();
        }
      };

      shell._gameKey = (type, k, e) => {
        if (type !== "down") return;
        if (k === "backspace") {
          press(null, true);
          e.preventDefault();
        } else if (k.length === 1) {
          press(k);
        }
      };

      shell._gameStart = () => reset();

      shell._gameUpdate = (dt) => {
        if (!running || over) return;
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          over = true;
          running = false;
          const wpm = Math.round((words * 5) / (DURATION / 60));
          shell.gameOver(words, { emoji: "⌨️", lines: [`About ${wpm} WPM`, words >= 35 ? "Certified keyboard violence." : "Fingers warming up."] });
          return;
        }
        dom.querySelector("#tm").textContent = Math.ceil(timeLeft);
        dom.querySelector("#pf").style.width = (timeLeft / DURATION) * 100 + "%";
      };
      shell._gameDraw = () => {};

      shell.startOverlay();
      reset();
    },
  });
})();
