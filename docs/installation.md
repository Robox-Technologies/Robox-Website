# Installation, and what actually happens during it

The short version, same as the README:

```bash
git clone https://github.com/Robox-Technologies/Robox-Website.git <directory>
cd <directory>
npm install
```

That's still all you type. This doc is for when something about the Python
editor doesn't work after cloning (a 404 for `/hub/pyodide/*` or
`/hub/roboxlib/*`, or `roboxlib import failed` in the console) and you want
to know what was *supposed* to happen, or why.

Beyond installing packages, `npm install` and the first `astro` command you
run each do one extra thing, both for the same reason: the [Python
editor's linter](pyodide-linting.md) depends on two things that are
deliberately **not** committed to this repo -- Pyodide's ~13MB WASM runtime,
and roboxlib's real source -- and something has to put them in place before
the editor can use them.

## 1. `npm install` → the roboxlib submodule

- Script: [`scripts/init-roboxlib-submodule.mjs`](../scripts/init-roboxlib-submodule.mjs), wired up as `package.json`'s `postinstall`.

[`roboxlib`](https://github.com/Robox-Technologies/Robox-pythonLibs) is a
separate repo (the actual MicroPython library that runs on the robot), added
here as a **sparse-checkout git submodule** at `vendor/robox-python-libs`.
Sparse-checkout means `.gitmodules` points at the whole roboxlib repo, but
only 4 files actually get checked out locally:

```text
vendor/robox-python-libs/src/roboxlib.py
vendor/robox-python-libs/src/calibration.py
vendor/robox-python-libs/src/colors.py
vendor/robox-python-libs/src/matrix.py
```

(the last three are `roboxlib.py`'s own pure-Python dependencies -- no
hardware imports, so they run under Pyodide's CPython too). None of
roboxlib's firmware, hardware design files, or anything else in that repo
ends up on disk here.

A plain `git submodule add` only records *that* a submodule exists
(`.gitmodules` + a commit pointer) -- the sparse-checkout scoping itself is a
**local, per-clone git setting** that doesn't travel with the repo. Without
the postinstall script, every fresh clone (or CI run) would need someone to
manually run:

```bash
git submodule update --init vendor/robox-python-libs
git -C vendor/robox-python-libs sparse-checkout init --no-cone
git -C vendor/robox-python-libs sparse-checkout set /src/roboxlib.py /src/calibration.py /src/colors.py /src/matrix.py
```

The script runs exactly those commands automatically, every `npm install`.
It's idempotent -- running it again when the submodule is already correctly
checked out is a harmless no-op -- so if something's ever out of sync, just
re-run `npm install` (or `node scripts/init-roboxlib-submodule.mjs` directly).

Upgrading which roboxlib commit this repo tracks is a deliberate, reviewable
step, same as any other dependency bump:

```bash
cd vendor/robox-python-libs
git fetch
git checkout <new-commit-or-tag>
cd ../..
git add vendor/robox-python-libs
git commit
```

## 2. The first `astro` command → copying binaries into `public/`

- Integrations: [`astro/integrations/pyodide/syncPyodideAssets.ts`](../astro/integrations/pyodide/syncPyodideAssets.ts), [`astro/integrations/roboxlib/syncRoboxlibAssets.ts`](../astro/integrations/roboxlib/syncRoboxlibAssets.ts)
- Registered in [`astro.config.ts`](../astro.config.ts)'s `integrations` array.

Neither Pyodide's runtime nor roboxlib's `.py` files are committed to git --
see [`pyodide-linting.md`](pyodide-linting.md) for the full reasoning, but
short version: Pyodide's wasm/stdlib (~13MB) is already sitting in
`node_modules/pyodide` after step 1's `npm install`, and roboxlib's source is
already sitting in `vendor/robox-python-libs` after the submodule init above
-- committing *another* copy of either into `public/` would just be shipping
the same bytes twice and bloating git history for no reason.

Instead, two small Astro integrations copy what's needed into `public/hub/`
(both gitignored, both regenerated every time):

| From | To |
| --- | --- |
| `node_modules/pyodide/pyodide.asm.*`, `python_stdlib.zip`, `pyodide-lock.json` | `public/hub/pyodide/` |
| `vendor/robox-python-libs/src/*.py` | `public/hub/roboxlib/` |

Both run on the `astro:config:setup` hook, which fires on **every** `astro`
CLI invocation -- `astro dev`, `astro build`, `astro check`, `astro preview`
-- not just whichever npm script happens to be named right. An earlier
version of this used npm `predev`/`prebuild` scripts instead, but those only
fire for that *exact* npm script name -- a command that shells out to
`astro build` directly, or a teammate running `npx astro dev`, would
silently skip it. Hooking into Astro's own integration lifecycle instead
means there's no specific command to remember to run -- the moment `astro`
itself starts, front to back, the files are there.

Both integrations skip themselves entirely when `IOS_BUILD=true` (used by
`npm run build:ios`/`ios`/`preview:ios`): linting is web-only, so there's no
reason to spend the file-copy time or ship either into the iOS app bundle.

## Directory map

```text
vendor/robox-python-libs/   git submodule, sparse -- the one thing actually
                             committed (as a submodule pointer, not the files
                             themselves)
public/hub/pyodide/         gitignored, regenerated from node_modules/pyodide
public/hub/roboxlib/        gitignored, regenerated from vendor/robox-python-libs
```

If either `public/hub/` directory is missing or stale, delete it and run any
`astro` command (`npm run dev` is the easiest) -- it gets rebuilt from
scratch every time, so there's no cache to invalidate.
