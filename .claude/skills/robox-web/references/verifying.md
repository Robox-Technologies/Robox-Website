# Verifying changes

The standing expectation here: **you check that it works, then show the user
evidence.** Not "please take a look and let me know."

## Running the site

```bash
npm run dev          # astro dev --port 3000  (also .claude/launch.json "astro-dev")
npm run build        # astro check && astro build — type errors are build errors
npm run preview      # serve the built output on :3000
npm run fix          # prettier --write . && eslint --fix .
```

Astro 7 allows one dev server per project root, keyed on `<root>/.astro/dev.json`.
To run a second server alongside one that's already up (e.g. the app branch with
`IOS_BUILD=true`), move that file aside and restore it afterwards.

`npm run build` does **not** cover: email rendering, the iOS `dist/` transform, or
anything that needs real Stripe/AusPost/CMS credentials.

## Browser loop

Use `preview_start` (`astro-dev`) and the `preview_*` tools. Order that avoids
wasted round-trips:

1. `preview_console_logs` / `preview_logs` — errors first.
2. `preview_snapshot` — text and structure (cheaper and more reliable than a
   screenshot for "is the content there").
3. `preview_inspect` with explicit CSS properties — the only trustworthy way to
   check colours, spacing, font sizes.
4. `preview_click` / `preview_fill` + snapshot for interactions.
5. `preview_resize` for the 1000px/1050px breakpoints and dark mode.
6. `preview_screenshot` last, as evidence for the user.

## Traps that cost real time before

- **Stale scoped CSS.** Editing an `.astro` component's `<style>` can leave the
  dev server injecting the *old* scoped CSS even though `curl`ing the page shows
  the new rules — Vite's transform cache for the `?astro&type=style` module goes
  stale. `touch <file>.astro`, load a fresh tab, and confirm before concluding
  your CSS is wrong:
  ```js
  [...document.querySelectorAll('style')].some(s => s.textContent.includes('<your-selector>'))
  ```
- **Screenshots lie about numbers.** They come back downscaled. For anything
  numeric use `getBoundingClientRect()` / computed styles.
- **Below-the-fold capture.** The in-app browser pane can return blank frames for
  scrolled content and time out on scrolling; only `scrollY === 0` captures are
  reliable. Workaround that works: at runtime, JS-shrink the `100vh` hero
  (`document.querySelector('section').style.height = '120px'`), `display:none` the
  tall sections above your target (walk up to `<body>` hiding ancestor siblings),
  set a tall viewport, `scrollTo(0, 0)`, then screenshot. Runtime only — never
  commit those edits.
- **Viewport resets.** "Reset to native size" can leave `innerWidth: 0` and break
  every responsive rule. Always set an explicit width.
- **Grep the built output for the exact string, not a substring** when checking
  injected CSS/HTML — a malformed rule still contains the substring you're
  looking for (see the `@view-transition` trap in `references/styling.md`).

## iOS checks

`IOS_BUILD=true npm run dev` renders the app branches with web routing intact —
good enough for layout work. Verify at 1024x768 and 1366x1024 landscape. Anything
touching WKWebView behaviour (view transitions, the Blockly toolbox, SQLite on
native) needs a real device or simulator via `npm run ios`; the in-app dev
browser is Chromium and will not reproduce Safari 15 behaviour.
