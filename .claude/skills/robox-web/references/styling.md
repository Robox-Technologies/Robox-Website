# Styling systems

Tailwind v4 via `@tailwindcss/vite`, plus one hand-written stylesheet
(`src/styles/global.css`) that owns the design tokens and the shared interaction
systems. Sass is available; MDX content styling lives in `markdown.css`.

## Tokens live in `@theme`

`global.css` declares the palette and layout scale as theme variables, so they're
usable as Tailwind utilities (`bg-blue`, `text-black`, `rounded-[--border-radius]`)
and in raw CSS (`var(--color-red)`). Ported 1:1 from the original site's
`_variables.scss`.

Brand colours: `--color-blue #2588c7`, `--color-green #91cc31`,
`--color-yellow #ffcd44`, `--color-red #ff6166`, `--color-black #405c64`
(the "black" is a slate, not `#000`), `--color-drop-shadow #26363b`.
Tones `--color-tone1..4`, `--color-primary #f8f8f8` (page bg),
`--color-secondary #c6c6c6`. Layout: `--stroke-size 3px`, `--header-height 56px`,
`--standard-gap 32px`, `--border-radius 20px`, plus button and article-margin
scales. Reach for a token before inventing a hex value.

Nunito ships as one variable font file, and the `@font-face` block declares the
**weight range 200–1000**. Without the range the browser files the face as
weight 400 and synthesises heavier weights, which smears glyphs — so don't
"simplify" those `@font-face` rules.

## Interaction systems in `@layer components`

Three families, and new UI should join them rather than hand-roll hover states:

- **Buttons** — `.button-standard`, `.cta-button`, `.button-interactive`
  (+ `.button-interactive-light` for dark backgrounds), `.box-shadow`.
  `.button-interactive::after` carries the hover wash; press, focus-visible and
  disabled states are all handled, including a `prefers-reduced-motion` branch.
- **Cards** — `.card-interactive` owns cursor, lift, press and focus-visible;
  `.card-cta` is the pill *inside* a card. Opt out of the press with
  `.card-no-press`.
- **Carousels** — `.carousel-item` and friends, including focus-visible handling.

### The whole-card link contract

`src/components/card.tsx` takes an `href` and renders the card element itself as
the `<a>`. Do **not** wrap a `Card` in an outer anchor — the point is one click
target (kinder on touch) and one hover scope, so a CTA lights up when you hover
anywhere on the card.

New card: put `card-interactive box-shadow` in `className`, pass `href`, and make
any button-looking pill a `<span class="card-cta">` — never a nested `<button>`
or `<a>`. Background colour belongs on the Card root (`className`), not
`contentClass`; the card pads below the inner block, so a background on
`contentClass` leaves a bare strip.

## Tailwind v4 vs hand-written CSS

Tailwind v4 compiles `-translate-y-1/2` to the **individual `translate`
property** (`translate: 0 -50%`). Individual transform properties apply *before*
`transform`, so:

- CSS in `global.css` that writes `translate:` **replaces** the utility. This is
  how the shared button press state once knocked the carousel arrows 16px out of
  centre.
- Writing the same offset as `transform: translateY(1px)` composes on top of the
  utility's centring, of inline `style.transform = rotate(...)` (the gear
  button), and of `animate-bounce`.

Rule of thumb: **utilities own `translate`, hand-written CSS uses `transform`.**

Two more layer-interaction traps:

- `@layer base` colours every `<span>` dark, which wins over a parent's
  `text-white`. Spans used as decoration (hamburger bars) need `color: inherit`.
- A `visibility` transition must be listed explicitly or an element snaps to
  hidden and the exit animation never plays (the mobile menu close).

## Goobers and eye tracking

Goobers are the decorative blob shapes (`star`, `pentagon`, `spiky`, `square`,
`bowtie`) in `src/images/goobers/`, rendered through `src/components/Goober.astro`:
`aria-hidden`, `pointer-events-none absolute -z-10`, caller-positioned via `class`
(shape) and `eyesClass` (eyes overlay), width set by the caller with height
following the SVG aspect ratio.

`src/utils/eyes.ts` (`initEyes()`, wired in `StandardLayout`) makes every `.eyes`
element lean toward the pointer, with the offset asymptotically approaching a cap
(`5 - 200/(dist+40)` percent of its own size) — on `mousemove`, on scroll, and on
touch (`touchstart`/`touchmove` aim, `touchend` releases). **The script writes the
element's inline `transform`,** so an eyes overlay must be positioned with insets
only; a `translate`/`transform` utility there will be clobbered.

Verified goober sizes match the original: star 290x300 (the original capped both
max-width and max-height at 300px on a 383x396 SVG), pentagon 210x217, spiky
280x285, square 150x150 with 103x43 eyes, footer eyes 195x82, teacher hero eyes
195px inset 32px from top-right, about bowtie 108px / eyes 180px.

## Breakpoints that aren't Tailwind's

The original site's breakpoints are reproduced with arbitrary variants, and they
are deliberate — don't "tidy" them into `lg`/`md`:

- **1050px** — desktop nav collapses to the hamburger (`max-[1050px]:hidden`,
  `min-[1050px]:hidden`). `Header.astro` also spells the media query out
  longhand as `@media not all and (min-width: 1050px)` to match how Tailwind
  compiles the variant.
- **1000px** — goobers hide (`max-[1000px]:hidden`) and article margins halve
  (64px → 32px).

`pageHero.tsx` stacks its two angled panels into full-width blocks below `md`.
`Hero.astro`/`Hero.tsx` takes an optional `heroMobile` portrait crop used below
`lg`, with `object-[30%_center]` on desktop.

## Astro `<style>` mechanics

- Content inside `<style>` in a `.astro` file is **raw CSS, not a JSX region**.
  `<style>{`@view-transition { navigation: auto; }`}</style>` emits the literal
  braces and backticks as text; the browser silently ignores the invalid rule,
  and grepping the built HTML "finds" the string. Use
  `<style is:inline set:html="..." />` for anything dynamic or conditional —
  `is:inline` keeps it unprocessed and unscoped and respects a surrounding
  `{isIOSBuild && ...}`, while `set:html` passes the CSS as a real string.
- Scoped styles can go stale in dev; see `references/verifying.md`.
