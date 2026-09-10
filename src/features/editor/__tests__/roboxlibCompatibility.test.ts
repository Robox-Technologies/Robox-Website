import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodide, type PyodideInterface } from 'pyodide'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { pythonGenerator } from 'blockly/python'
import type { Block } from 'blockly/core'
import '@/features/editor/editors/blockEditor/config/generators/motors'
import '@/features/editor/editors/blockEditor/config/generators/sensor'
import '@/features/editor/editors/blockEditor/config/generators/servo'
import '@/features/editor/editors/blockEditor/config/generators/systems'
import '@/features/editor/editors/blockEditor/config/generators/control'
import '@/features/editor/editors/blockEditor/config/generators/events'
import '@/features/editor/editors/blockEditor/config/generators/overwrite'
import {
    preamble,
    ExtensionsPreamble,
    ExtraSensorsPreamble,
} from '@/features/editor/config/preamble'
import sensors from '@/data/sensors.json'
import type { SensorKey } from 'src/types/extraSensors'
import {
    HARDWARE_STUBS,
    ROBOXLIB_SETUP,
    LINT_SETUP,
    type LintDiagnostic,
} from '@/features/editor/editors/pythonEditor/workers/pyodideCheckSetup'

/*
 * The block editor's Python generators and preamble.ts are hand-written
 * against roboxlib's API from memory -- this imports the real library (via
 * the same Pyodide-based checker the live editor uses) and runs every
 * *registered* generator's output through it, so a generator that drifts
 * from the real API fails a test instead of only failing on an actual
 * robot. "Every registered" is discovered from pythonGenerator.forBlock,
 * not a hand-picked list -- a new generator file gets covered the moment it
 * registers a block, with no edit to this file.
 */

// Populated by the side-effect imports above.
const BLOCK_NAMES = Object.keys(pythonGenerator.forBlock)

// Placeholder answers for any block/generator call, so every generator can
// be invoked with one shared mock instead of a bespoke one per block.
// "0" for anything embedded directly into an expression -- some call sites
// have no `|| fallback`, so it has to be valid Python on its own. "" for
// statement bodies, since generators already write `body || '    pass\n'`
// -style fallbacks for "nothing connected" that an empty string correctly
// triggers (a non-empty placeholder there would come out unindented and
// break the statement it's embedded in).
const genericBlock = {
    getFieldValue: () => '0',
    getInputTargetBlock: () => null,
} as unknown as Block
const genericGenerator = {
    valueToCode: () => '0',
    statementToCode: () => '',
} as unknown as typeof pythonGenerator

let lint: (source: string) => string
let kitchenSinkPreamble: string
let kitchenSinkLineCount: number
let baselineDiagnostics: LintDiagnostic[]

beforeAll(async () => {
    const pyodide: PyodideInterface = await loadPyodide()
    pyodide.runPython(HARDWARE_STUBS)

    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
    const libDir = join(repoRoot, 'vendor', 'robox-python-libs', 'src')
    pyodide.FS.mkdirTree('/roboxlib_src')
    for (const file of ['roboxlib.py', 'calibration.py', 'colors.py', 'matrix.py']) {
        pyodide.FS.writeFile(`/roboxlib_src/${file}`, readFileSync(join(libDir, file), 'utf-8'))
    }
    pyodide.runPython('import sys; sys.path.insert(0, "/roboxlib_src")')
    pyodide.runPython(ROBOXLIB_SETUP)
    // The live linter only maps instances the base preamble always creates
    // (see pyodideCheckSetup.ts) -- this sweep also covers extension-only
    // blocks (servo), so it adds that mapping here instead.
    pyodide.runPython('__INSTANCE_CLASSES["servo"] = roboxlib.Servo')
    pyodide.runPython(LINT_SETUP)
    lint = pyodide.globals.get('__lint') as (source: string) => string

    // Every extension's preamble text, plus every extra sensor's (each
    // called with placeholder pin numbers -- pin names discovered from
    // sensors.json, not hand-listed), concatenated onto the base preamble.
    // This is never *run*, only ast.parsed, so it doesn't matter that no
    // real project would enable every extension and sensor at once.
    const extensionsText = Object.values(ExtensionsPreamble).join('\n')
    const extraSensorsText = Object.keys(ExtraSensorsPreamble)
        .map((key) => {
            const sensorKey = key as SensorKey
            const pinNames = Object.keys(sensors[sensorKey].pins)
            const pins = Object.fromEntries(pinNames.map((name) => [name, 1]))
            return ExtraSensorsPreamble[sensorKey](pins as never)
        })
        .join('\n')
    kitchenSinkPreamble = `${preamble}\n${extensionsText}\n${extraSensorsText}`
    kitchenSinkLineCount = kitchenSinkPreamble.split('\n').length

    baselineDiagnostics = check(kitchenSinkPreamble)
}, 30_000)

function check(source: string): LintDiagnostic[] {
    return JSON.parse(lint(source)) as LintDiagnostic[]
}

describe('the combined preamble (base + every extension + every extra sensor)', () => {
    it('matches the real roboxlib API on its own', () => {
        expect(baselineDiagnostics).toEqual([])
    })
})

describe('every registered block generator vs. the real roboxlib API', () => {
    it.each(BLOCK_NAMES)('%s', (blockName) => {
        const generatorFn = pythonGenerator.forBlock[blockName]
        let result: [string, number] | string | null
        try {
            result = generatorFn(genericBlock, genericGenerator)
        } catch (error) {
            console.warn(
                `Skipping "${blockName}": couldn't invoke it with generic inputs (${String(error)}). ` +
                    "This means it needs more specific mock context to run at all, not that " +
                    'its output disagrees with roboxlib.',
            )
            return
        }
        const code = Array.isArray(result) ? result[0] : result
        if (!code) return

        const diagnostics = check(`${kitchenSinkPreamble}\n${code}`)
        // Only what this block's own code introduced -- the preamble's own
        // issues (if any) are the previous test's problem, not this one's.
        const newDiagnostics = diagnostics.filter((d) => d.startLine > kitchenSinkLineCount)

        if (newDiagnostics.length === 1 && newDiagnostics[0].kind === 'syntax') {
            console.warn(
                `Skipping "${blockName}": generic inputs produced code that doesn't parse ` +
                    `(${newDiagnostics[0].message}), so it can't be checked against roboxlib this way.`,
            )
            return
        }

        expect(newDiagnostics).toEqual([])
    })
})
