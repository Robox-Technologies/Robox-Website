# Commerce, data and email

## Env vars

`.example.env` is the template; keep it in sync when adding a variable.

- Stripe: `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
  The **client** key is declared in `astro.config.ts` `env.schema` as
  `context: 'client', access: 'public', optional: true` and imported from
  `astro:env/client` — `import.meta.env` will not have it. It's `optional` so the
  iOS bundle and CI builds without Stripe credentials still build; a missing key
  fails at checkout runtime instead.
- `AUSPOST_KEY`, `AUSPOST_ORIGIN_POSTCODE` — shipping quotes.
- `RESEND_KEY` (+ legacy `EMAIL_*` SMTP vars) — transactional email.
- `CMS_URL` — external headless CMS (default `http://localhost:3333`).
- `FORCE_CACHE=true` makes the server-side Stripe/AusPost caches never expire, so
  a build or an offline session hits each upstream once. Useful when iterating
  without credentials churn; leave false in production.
- `SITE_URL` drives canonical links, the `og:image` URL and the sitemap. Anything
  other than `PRODUCTION_ORIGIN` is also marked noindex (`src/data/seo.ts`), so a
  dev host can't get itself indexed.

## Checkout flow

- Actions in `src/features/shop/checkout/actions/`: `createPaymentIntent`,
  `updatePaymentIntent`, `getShippingQuote` — all `.server.ts`, all re-exported
  from `src/actions/index.ts`. Call them from islands via `astro:actions`.
- Payment UI is React (`@stripe/react-stripe-js`) under
  `checkout/components/payment/` and `components/summary/`, with local state in
  `checkout/state/` and `checkout/hooks/`.
- `src/pages/api/shop/webhook.ts` receives Stripe events (needs the raw body and
  `STRIPE_WEBHOOK_SECRET`); order emails are sent from there via
  `emails/utils/sendOrderEmail.server.ts`.
- Cart lives in `nanostores` — `src/state/cartStore.ts` + `cartActions.ts`,
  consumed in React with `@nanostores/react`. Mutate through `cartActions`, not
  by writing the store directly, so persistence and derived totals stay correct.
- Server helpers: `src/utils/server/stripe/`, `cache.server.ts`,
  `checkoutSession.server.ts`, `rateLimit.server.ts` (public API routes are rate
  limited), `safeUrl.ts` (validate any user-supplied redirect target).
- `products.json` at the repo root is a generated Stripe-sourced snapshot — don't
  hand-edit it as a way to change catalog data.

## CMS

`src/utils/server/cms.server.ts` fetches from `CMS_URL`; `lexicalToHtml.ts`
renders rich text and `renderBanner.server.ts` handles banner blocks. CMS-driven
surfaces (teacher lesson plans, student resources) render card grids — use the
existing `Card`/`ResourceCard` system (see `references/styling.md`). Content is
sanitised with `dompurify` before injection.

## Email (jsx-email + Resend)

Templates are React components under `src/features/emails/`:
`templates/ReceiptEmail.tsx`, `templates/PaymentFailedEmail.tsx`, shared
`components/` (`EmailLayout`, `Masthead`, `OrderSummary`, `BillingDetails`,
`SignOff`, `Socials`, `Footer`, `ThemedImg`), with `styles.ts` transcribed from
the original `email.css`, `fonts.ts`, `assets.ts`, and plain-text builders in
`text/orderEmailText.ts`.

Deliberate departures from the library, made for parity — don't "simplify" them
back:

- **Hand-rolled `<Font>`**: jsx-email's emits `* { font-family }`, so two of them
  means the last wins globally and headings lose Nunito.
- **Hand-rolled container**: jsx-email's `<Container>` hardcodes a 600px
  `max-width`, clamping the design's 700px.
- The layout has no `#FFFFFF` body background (it breaks dark mode — white text
  on white), keeps a real `<!--[if mso]>` wrapper, and needs the `discount-row`
  class for the dark override to bind.
- Plain text comes from the builders in `text/`, not
  `render({ plainText: true })`, which emits duplicated link text, run-together
  social URLs and SHOUTED headings.

Verify loop:

```bash
npx email build src/features/emails/templates --out build/emails --use-preview-props --plain
```

`--use-preview-props` is required — without it templates render with undefined
props and crash on `items.map`. `npm run email:preview` opens the live preview.
Email images live in `public/email/` and are served at `/email/<file>`
(`src/pages/public/email/[...file].ts` also proxies them, path-validated).
Remember `npm run build` does **not** exercise email rendering — send a real test
email after touching the jsx-email dependency chain.

## Markdown / MDX content

Legal pages and articles are MDX (`src/data/legal/`, `src/pages/articles/[slug].astro`)
rendered through `LegalLayout`/article components with `markdown.css`. The custom
remark plugin `RoboxSectionize` (`astro/integrations/markdown/roboxSectionize.ts`)
wraps headings into sections; it needs `@astrojs/markdown-remark` as an explicit
dependency since Astro 7 stopped bundling the remark pipeline. The config still
uses the deprecated `markdown.remarkPlugins` (warns, non-fatal — the eventual
cleanup is passing it to `unified({...})`).
