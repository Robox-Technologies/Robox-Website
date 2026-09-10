# Python editor linting

The Python code editor (`/hub/editor`) gets real Python syntax and
argument-count checking by running actual CPython -- via
[Pyodide](https://pyodide.org), a WASM build of CPython -- in a Web Worker,
off the main thread. It is **not** a hand-rolled parser: syntax errors come
from Python's own `compile()`, and argument-count/keyword errors come from
`inspect.Signature.bind()` against the real signature of the builtin or
user-defined function being called, so students see the same error Python
itself would raise.

- Worker (loads Pyodide, runs the checks): [`src/features/editor/editors/pythonEditor/workers/pyodideLint.worker.ts`](../src/features/editor/editors/pythonEditor/workers/pyodideLint.worker.ts)
- Wiring (debounce, Monaco markers): [`src/features/editor/editors/pythonEditor/config/linting.ts`](../src/features/editor/editors/pythonEditor/config/linting.ts)
- Mount point: [`src/features/editor/editors/pythonEditor/components/editor.astro`](../src/features/editor/editors/pythonEditor/components/editor.astro)

## Scope

Only checks that don't need real type inference:

- Real Python `SyntaxError`s (unmatched brackets, missing colons, bad
  indentation, ...).
- Argument count/keyword checks for calls to **builtins** (`len(1, 2)`) and
  the student's own **top-level functions** (`def foo(a, b): ...` called as
  `foo(1)`).
- **Not** checked: method calls (`motors.run_motors(1)`), since that needs
  knowing the type of `motors` -- there's no static analysis of what a name
  refers to beyond a plain function/class lookup. Once roboxlib's real source
  is available to the linter, this is the natural place to extend.

Linting is web-only. It's skipped entirely on the iOS build (`IOS_BUILD=true`)
-- Pyodide is a ~13MB WASM blob with no track record in the iOS WKWebView
target, unlike the rest of this editor, so it isn't shipped there rather than
risk bloating/breaking the app bundle.

## Why the Pyodide runtime isn't committed to git

`pyodide` is a normal `npm install` dependency (see `package.json`), so its
wasm + stdlib zip (~13MB) already land in `node_modules/pyodide` on every
install. Committing a second copy into `public/` would mean shipping the same
binary twice -- once in `node_modules` (gitignored, from npm) and once
tracked in git -- and bloating repo history with a binary that changes on
every Pyodide version bump.

Instead, [`astro/integrations/pyodide/syncPyodideAssets.ts`](../astro/integrations/pyodide/syncPyodideAssets.ts)
is a small Astro integration that copies those files from `node_modules/pyodide`
into `public/hub/pyodide/` (gitignored) on `astro:config:setup` -- the hook
that fires on **every** `astro` CLI invocation (`dev`, `build`, `check`,
`preview`), regardless of which npm script or IDE launch config triggers it.
That's deliberate: an npm `pre*` script only fires when someone runs that
*exact* npm script name, so a new command that shells out to `astro build`
directly (or a teammate running `npx astro dev`) would silently serve a 404
for `/hub/pyodide/*` instead. Hooking the sync into Astro's own integration
lifecycle means there's nothing to remember to wire up.

If you bump the `pyodide` version in `package.json`, just re-run `npm install`
-- the next `astro dev`/`astro build` picks up the new files automatically.
