# The iOS app half of the repo

The Capacitor app (`appId: com.robox.editor`, appName `Ro/Box`) ships the *same*
`src/` as the website, filtered down at build time. So most iOS constraints are
really constraints on the whole codebase.

## How the build differs

- `npm run build:ios` → `IOS_BUILD=true astro build` + `cap sync` + `cap open ios`.
  `npm run ios` runs it on a device/simulator; `npm run preview:ios` serves the
  iOS bundle at :3000.
- `transformIOSBuild()` (an `astro:build:done` integration in `astro.config.ts`)
  deletes every top-level folder in `dist/` except `_astro` and `hub`, deletes
  root `index.html`, then hoists `hub/` to the root. The app therefore boots
  straight into the student hub. Routes are *not* moved during `astro dev` —
  only `dist/` is rewritten.
- `IOS_BUILD` is read in `.astro` frontmatter, so `IOS_BUILD=true npm run dev`
  renders the app branches locally with the web routing intact. Current users:
  `StandardLayout`, `EditorLayout`, `pages/hub/index.astro`,
  `studentProjects.astro`, `blockEditor/.../projectHeader.astro`, `global.css`.
- The sitemap integration is skipped for `IOS_BUILD` (nothing for a crawler to
  find inside a filesystem-served app).
- `capacitor.config.ts` `webDir` is **`dist/client`**, not `dist` — the hybrid
  build (the API route pulls in the node adapter) emits the client there. Getting
  this wrong breaks `cap sync` entirely.
- `backgroundColor: '#f8f8f8ff'` matches `--color-primary` so the WKWebView
  doesn't paint white between documents.

## Design target: iPad, landscape

The app is designed for an iPad held in landscape — a wide, short viewport
(1024x768 → 1366x1024). "Mobile" inside an `IOS_BUILD` branch does not mean a
portrait phone: a `25vh` band lands at roughly 5:1 there. Preview app-only UI at
those two landscape sizes and treat phone widths as a graceful fallback.

## Do not switch the app to SPA navigation

Astro `ClientRouter` was tried thoroughly and reverted: with SPA nav the editor
must dispose and re-inject Blockly on each visit to the editor, and every
re-injection in the same JS session mis-sizes the `@blockly/continuous-toolbox`
flyout (SVG height balloons to all-blocks-stacked, e.g. 70569px — blocks render
below the editor). Ruled out as causes: container sizing, view-transition timing,
DOM residue, the workspace object, block recycling. It is continuous-toolbox
global state that doesn't survive a dispose/re-inject cycle.

Current approach: plain multi-page navigation plus a cross-document cross-fade,
injected iOS-only in the layout heads:

```astro
<style is:inline set:html="@view-transition { navigation: auto; }" />
```

A residual ~1-frame flash of `#f8f8f8` during the WKWebView document swap is
accepted. Removing it means replacing the continuous toolbox — a separately
scoped, on-device-testing-required effort, not a drive-by fix.

## CSS floor: Safari 15

`ios/App/App.xcodeproj` sets `IPHONEOS_DEPLOYMENT_TARGET = 15.0`. An unsupported
selector invalidates the entire rule *silently*, so a hover state simply never
applies on device while looking perfect in Chrome. Concretely: a selector list
inside `:not()` needs Safari 16.4 — chain instead.

```css
/* breaks on iOS 15 */
.button-interactive:hover:not(:disabled, [aria-disabled='true']) { }
/* works */
.button-interactive:hover:not(:disabled):not([aria-disabled='true']) { }
```

Individual `translate`/`rotate`/`scale` and `inset` are fine (Safari 14.1+).

## Student project storage: SQLite, not localStorage

WKWebView localStorage/IndexedDB gets evicted under iOS storage pressure, so
projects live in native SQLite (`@capacitor-community/sqlite`, iOS location
`Library/RoboxDatabase`).

- `src/utils/db.ts` — `getDB()`, `persist()`, table `projects(id TEXT PK, data TEXT)`
  where `data` is a JSON `UserProject`. Also runs the one-time
  `localStorage['roboxProjects']` → SQLite migration.
- All CRUD in `src/utils/serialization.ts` is **async**. Hub cards read from the
  `studentProjects/stores/projectsStore.ts` nanostore (`reloadProjects()`)
  because SQLite reads can't be sync-in-render the way localStorage was.
- Web uses `jeep-sqlite` (WASM → IndexedDB), needing `public/assets/sql-wasm.wasm`
  at `/assets/sql-wasm.wasm`. Call `persist()` after every web write (no-op on native).
- Two gotchas that both caused silent hangs, already fixed — don't regress them:
  1. `sql.js` is pinned to **exactly 1.11.0** because jeep-sqlite@2.8.0 was built
     against that glue; 1.14.x wasm imports differ (`LinkError: import function
     a:I must be callable`). The committed wasm must match the pin.
  2. Import the standalone component, not the lazy loader — `jeep-sqlite/loader`'s
     `defineCustomElements` registers the element but never hydrates it under
     Vite, so every `@Method()` hangs with no error:
     `import { JeepSqlite } from 'jeep-sqlite/dist/components/jeep-sqlite'`
     then `customElements.define('jeep-sqlite', JeepSqlite)`.
- Blockly toolbox: `config/blockly.ts` injects `BaseToolbox` synchronously, and
  `editor.astro` swaps in the extension-aware one via
  `workspace.updateToolbox(await generateToolbox())`.

## Robot communication

`src/libs/communication/`: Web Serial (`usb.ts`), Web Bluetooth (`webBle.ts`),
Capacitor BLE for iOS (`iosBle.ts`), unified behind `communicate.ts`. Pick the
transport through `communicate.ts` rather than importing a backend directly.
