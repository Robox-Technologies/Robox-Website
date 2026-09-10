#!/usr/bin/env node
/**
 * Keeps the roboxlib submodule checked out to just the files the Python
 * editor's linter actually needs, without every contributor having to
 * remember the sparse-checkout commands after cloning.
 *
 *   node scripts/init-roboxlib-submodule.mjs
 */
import { execFileSync } from 'child_process'

const SUBMODULE_PATH = 'vendor/robox-python-libs'
const SPARSE_PATHS = [
    '/src/roboxlib.py',
    '/src/calibration.py',
    '/src/colors.py',
    '/src/matrix.py',
]

function git(args, options = {}) {
    execFileSync('git', args, { stdio: 'inherit', ...options })
}

git(['submodule', 'update', '--init', SUBMODULE_PATH])
git(['sparse-checkout', 'init', '--no-cone'], { cwd: SUBMODULE_PATH })
git(['sparse-checkout', 'set', ...SPARSE_PATHS], { cwd: SUBMODULE_PATH })

console.log(`${SUBMODULE_PATH} sparse-checked-out to: ${SPARSE_PATHS.join(', ')}`)
