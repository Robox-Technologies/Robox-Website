---
name: robox-web
description: >-
  Playbook for developing the Ro/Box website — an Astro 7 + React 19 islands +
  Tailwind v4 codebase that is simultaneously a marketing/e-commerce site and a
  Capacitor iOS app. Use this whenever work touches this repo: editing .astro
  pages/layouts/components, React islands, global.css or Tailwind classes, cards,
  buttons, goobers, heroes, the header/footer, Astro Actions or API routes,
  Stripe checkout or Australia Post shipping, jsx-email templates, the Blockly
  block editor, student hub / SQLite project storage, IOS_BUILD branches, or any
  "make this page look/behave like X" request. Also use for build, `astro check`,
  dev-server, and browser-verification questions here. Read it before the first
  edit, not after — it records traps (Tailwind v4 `translate`, iOS 15 CSS floor,
  raw-CSS `<style>`, stale scoped CSS) that silently produce code that looks
  right and does nothing.
---

# Ro/Box website

One Astro project, two products:

1. **Marketing + e-commerce site** — home, about, teacher, shop (catalog, product,
   cart, checkout, status), articles, legal. `robox.com.au` / `dev.robox.com.au`.
2. **Student learning app** — a Blockly editor (`src/features/blockEditor`) that
   compiles visual blocks and pushes programs to a physical robot over USB/BLE.
   Shipped as a Capacitor iOS app; `npm run build:ios` strips the site down to
   just the hub (`transformIOSBuild()` in `astro.config.ts`).

The same `src/` serves both. **Every CSS and JS decision has to survive a
WKWebView on iOS 15** — see `references/ios-app.md`.

## Orient before editing

Repo shape worth knowing before you go looking:

| Where | What |
| --- | --- |
| `src/pages/` | routes only — thin, delegate to features |
| `src/features/<name>/` | feature-owned components + logic (`home`, `shop`, `catalog`, `studentHub`, `blockEditor`, `emails`) |
| `src/components/` | cross-feature primitives: `card.tsx`, `button.tsx`, `dialog.tsx`, `Goober.astro`, `Hero.astro`, `Meta.astro`, `pageHero.tsx`, `header/`, `footer/` |
| `src/layouts/` | `StandardLayout` (site), `EditorLayout` (app), `LegalLayout` |
| `src/styles/global.css` | design tokens (`@theme`), `@layer components` (button/card/carousel systems), `@layer base`, `@layer utilities` |
| `src/actions/index.ts` | every Astro Action, re-exported from `*.server.ts` files |
| `src/utils/server/` | server-only helpers (`cms.server.ts`, `stripe/`, `rateLimit.server.ts`, `safeUrl.ts`, `cache.server.ts`) |
| `src/state/` | `nanostores` (cart); `studentProjects/stores/` for hub projects |
| `src/data/` | `seo.ts` (noindex list + `PRODUCTION_ORIGIN`), products, legal MDX, sensor/extension JSON |
| `astro/integrations/markdown/` | `RoboxSectionize` remark plugin |

Conventions that the linter or a reviewer will hold you to:

- Server-only modules end in `.server.ts`. Actions live in a feature's
  `actions/` dir and are wired into `src/actions/index.ts`.
- Shared layers (`src/layouts`, `src/utils`, `src/libs`) may **not** deep-import
  feature internals — ESLint `no-restricted-imports` enforces feature public APIs.
- Path alias `@/*` → `src/*`. TS is `astro/tsconfigs/strict` + `verbatimModuleSyntax`
  (so `import type` matters).
- Formatting: 4-space indent, no semicolons, single quotes, trailing commas
  (`prettier.config.ts`, `@stylistic/indent`). `npm run fix` applies both.
- Client-visible env vars need the `PUBLIC_` prefix; the Stripe publishable key
  is declared in `astro.config.ts` `env.schema` and imported from
  `astro:env/client`, not `import.meta.env`.

## The working loop

The habit that has worked here, in order:

1. **Find the existing system before writing a new one.** This codebase is
   deliberately systematised: cards, buttons, carousels, goobers, eyes-tracking
   and page heroes each have one implementation. A hand-rolled hover state or a
   second card component is a regression even when it looks identical — it drifts
   the next time the system changes. Grep `global.css` for the class before
   inventing one.
2. **Edit, then verify in a real browser.** `npm run dev` (port 3000, also wired
   as the `astro-dev` config in `.claude/launch.json`) and the `preview_*` tools.
   Don't hand verification back to the user — check it and show them.
3. **Measure, don't eyeball.** Screenshots come back downscaled and lie about
   spacing and colour. Use `preview_inspect` / `getBoundingClientRect()` /
   computed styles for anything numeric. See `references/verifying.md` for the
   traps (stale scoped CSS, below-the-fold capture, viewport resets).
4. **`npm run build`** = `astro check && astro build`. Type errors are build
   errors here, so run it before declaring a change done. It does **not**
   exercise email rendering or the iOS transform.
5. **Commit as you go.** Yuma's standing preference: one commit per page or
   coherent phase with a short imperative subject (`Add new mobile goober
   behaviour`, `Downsize certain h1 tags (6xl -> 5xl)`), not one giant drop at
   the end. Work happens on `epic/astro`.

When a request is "make it match the old site": `/Users/yuma/robox/Robox-Website-ORIGINAL`
(pre-Astro webpack + EJS + SCSS) is the **source of truth for UI**, but several
Astro-era redesigns are intentional improvements and must not be reverted — see
`references/parity.md` before changing a hero or a layout on those grounds.

## Traps that fail silently

Each of these produced code that read correctly, built cleanly, and did nothing.
They are the reason this skill exists.

- **Tailwind v4 owns the `translate` property.** `-translate-y-1/2` compiles to
  `translate: 0 -50%`, not `transform`. Hand-written CSS that sets `translate:`
  *replaces* the utility. Express nudges as `transform: translateY(...)` so they
  compose. (`.button-interactive:active` records this.)
- **`<style>` in `.astro` is raw CSS, not JSX.** `<style>{`...`}</style>` dumps
  literal braces and backticks into the stylesheet. Inject dynamic CSS with
  `<style is:inline set:html="..." />`.
- **iOS 15 is the CSS floor** (`IPHONEOS_DEPLOYMENT_TARGET = 15.0`). A selector
  list inside `:not()` needs Safari 16.4 and invalidates the whole rule — chain
  `:not(:disabled):not([aria-disabled='true'])` instead.
- **The dev server can serve stale scoped CSS** after a `<style>` edit while
  `curl` shows the new rules. `touch` the `.astro` file and reload a fresh tab
  before concluding your CSS is wrong.
- **`global.css` `@layer base` colours every `<span>` dark**, which beats a
  parent's `text-white`. Styling spans (e.g. hamburger bars) needs
  `color: inherit`.
- **The eyes script owns `transform` on `.eyes` elements** — position eye
  overlays with insets only, never a `translate`/`transform` utility.

## Deeper references

Read the one that matches the task; they're written to be skimmed:

- `references/ios-app.md` — IOS_BUILD branches, Capacitor/`cap sync`, iPad
  landscape as the design target, why `ClientRouter` is banned, SQLite project
  storage and its two web gotchas, previewing the iOS branch locally.
- `references/styling.md` — design tokens, the button/card/carousel systems,
  `Card`'s whole-card link contract, goobers and eye tracking, responsive
  breakpoints (1050px header, 1000px goobers) and why they aren't Tailwind's.
- `references/commerce.md` — Stripe payment intents + webhook, Australia Post
  quotes, cart nanostores, the external CMS, and the jsx-email/Resend pipeline
  including its hand-rolled `Font`/`Container`.
- `references/verifying.md` — the browser verification loop, measuring instead of
  screenshotting, running a second dev server, email and iOS build checks.
- `references/parity.md` — what ORIGINAL is authoritative for, what was
  deliberately redesigned, and the standing "goobers stay" directive.
