# Parity with the original site

`/Users/yuma/robox/Robox-Website-ORIGINAL` is the pre-Astro stack (webpack +
Express `server.ts`, EJS `.html` templates + SCSS, Payload CMS via `CMS.ts`). It
is the **source of truth for UI and styling** — when a visual detail is
ambiguous, measure the original rather than guessing.

Running it as a reference: `npm --prefix /Users/yuma/robox/Robox-Website-ORIGINAL run dev:build`,
then serve `build/server/server.js` on port 3000. It needs a real Stripe key in
ORIGINAL's `.env` — the webpack build fetches products at build time and dies
with `StripeAuthenticationError` otherwise. Both projects want port 3000, so run
one at a time. Live `robox.com.au` also still serves the original UI.

## What is deliberately different — don't "restore" it

- **Angled `PageHero` designs** on shop / teacher / student are intentional
  Astro-era improvements. Keep them; the original's goober heroes are not the
  target for those pages.
- **Goobers are retained site-wide** (home, about, teacher resources, footer) —
  standing user directive.
- The hub-card goobers (pentagon/spiky) are **invisible in the original**:
  `.card { overflow: hidden }` clips them and `z-index: -1` hides them behind the
  card background. The new site shows them on purpose. Do not "fix" this back.
- Nav wording stays **"Shop"** (the original said "Store") — explicitly not a
  concern.
- Where the new layout differs in size, translate the original's percentages into
  absolute px rather than copying them: e.g. the about hero's 30%/50% offsets
  assumed a 500px green block, ours is 400px.

## Working style on parity work

The user's directive on these sweeps is **commit as you go** — one commit per
page or phase, so a regression is bisectable and review is readable. Screenshot
or measure both sites before starting a page, port assets first, then reconcile
content, then polish responsive behaviour.

Folder renames to expect when porting assets from ORIGINAL:
`landing/` → `index/`, `product/` → `shop/products/`, `student-hub`/`teacher-hub`
→ `studentHub`/`teacherHub`.
