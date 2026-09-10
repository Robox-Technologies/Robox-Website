# Python editor linting

The Python code editor (`/hub/editor`) gets real Python syntax and
argument-count checking by running actual CPython -- via
[Pyodide](https://pyodide.org), a WASM build of CPython -- in a Web Worker,
off the main thread. It is **not** a hand-rolled parser: syntax errors come
from Python's own `compile()`, and argument-count/keyword errors come from
`inspect.Signature.bind()` against the real signature of the builtin or
user-defined function being called, so students see the same error Python
itself would raise.

- Worker (loads Pyodide, loads roboxlib, runs the checks): [`src/features/editor/editors/pythonEditor/workers/pyodideLint.worker.ts`](../src/features/editor/editors/pythonEditor/workers/pyodideLint.worker.ts)
- The actual checking logic, shared with the compatibility test below: [`src/features/editor/editors/pythonEditor/workers/pyodideCheckSetup.ts`](../src/features/editor/editors/pythonEditor/workers/pyodideCheckSetup.ts)
- Wiring (debounce, Monaco markers): [`src/features/editor/editors/pythonEditor/config/linting.ts`](../src/features/editor/editors/pythonEditor/config/linting.ts)
- Mount point: [`src/features/editor/editors/pythonEditor/components/editor.astro`](../src/features/editor/editors/pythonEditor/components/editor.astro)
- Generators/preamble checked against the real library automatically: [`src/features/editor/__tests__/roboxlibCompatibility.test.ts`](../src/features/editor/__tests__/roboxlibCompatibility.test.ts)

## Scope

Only checks that don't need real type inference:

- Real Python `SyntaxError`s (unmatched brackets, missing colons, bad
  indentation, ...).
- Argument count/keyword checks for calls to **builtins** (`len(1, 2)`), the
  student's own **top-level functions** (`def foo(a, b): ...` called as
  `foo(1)`), **roboxlib class constructors** (`UltrasonicSensor(trig_pin=4)`),
  and **method calls on the base preamble's instances** (`motors.run_motors(1)`)
  -- checked against roboxlib's real classes (see `docs/installation.md` for
  where those come from), via `inspect.Signature.bind()` on the actual method,
  so students see the same error the real library would raise.
- **Not** checked: method calls on extension-only instances (e.g. `servo`,
  which only exists if the SERVO extension is enabled) -- the live linter
  doesn't know which extensions a given project has turned on, only the
  fixed instances the base preamble always creates. The compatibility test
  (`src/features/editor/__tests__/roboxlibCompatibility.test.ts`) covers
  `servo` separately, since it already knows the full extension list.
- **Not** checked, at all: bare attribute reads with no call (`servo.angle`)
  -- only `ast.Call` nodes are inspected, so a property access with no
  parentheses is invisible to this mechanism regardless of instance.

Linting is web-only. It's skipped entirely on the iOS build (`IOS_BUILD=true`)
-- Pyodide is a ~13MB WASM blob with no track record in the iOS WKWebView
target, unlike the rest of this editor, so it isn't shipped there rather than
risk bloating/breaking the app bundle.

## Why the Pyodide runtime isn't committed to git

See [`installation.md`](installation.md) for the full picture, including how
roboxlib's real source (not a hand-written copy of its API) gets into the
build the same way. Short version:

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
