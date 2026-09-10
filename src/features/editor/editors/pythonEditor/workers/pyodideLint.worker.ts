import { loadPyodide, type PyodideInterface } from 'pyodide'
import {
    HARDWARE_STUBS,
    ROBOXLIB_SETUP,
    LINT_SETUP,
    DESCRIBE_SETUP,
    type LintDiagnostic,
    type RoboxlibClass,
} from './pyodideCheckSetup'

export type { LintDiagnostic, RoboxlibClass }

export type WorkerRequest =
    | { kind: 'lint'; id: number; code: string }
    | { kind: 'describe'; id: number }

export type WorkerResponse =
    | { kind: 'lint'; id: number; diagnostics: LintDiagnostic[] }
    | { kind: 'describe'; id: number; classes: RoboxlibClass[] }

const ROBOXLIB_DIR = '/roboxlib_src'
const ROBOXLIB_FILES = ['roboxlib.py', 'calibration.py', 'colors.py', 'matrix.py']

async function loadRoboxlibSource(pyodide: PyodideInterface) {
    pyodide.FS.mkdirTree(ROBOXLIB_DIR)
    for (const file of ROBOXLIB_FILES) {
        const response = await fetch(`/hub/roboxlib/${file}`)
        const text = await response.text()
        pyodide.FS.writeFile(`${ROBOXLIB_DIR}/${file}`, text)
    }
    pyodide.runPython(`import sys; sys.path.insert(0, "${ROBOXLIB_DIR}")`)
    pyodide.runPython(ROBOXLIB_SETUP)
}

let pyodidePromise: Promise<PyodideInterface> | null = null

function getPyodide(): Promise<PyodideInterface> {
    pyodidePromise ??= loadPyodide({ indexURL: '/hub/pyodide/' }).then(async (pyodide) => {
        pyodide.runPython(HARDWARE_STUBS)
        await loadRoboxlibSource(pyodide)
        pyodide.runPython(LINT_SETUP)
        pyodide.runPython(DESCRIBE_SETUP)
        return pyodide
    })
    return pyodidePromise
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const request = event.data
    try {
        const pyodide = await getPyodide()
        if (request.kind === 'lint') {
            const lint = pyodide.globals.get('__lint') as (source: string) => string
            const diagnostics = JSON.parse(lint(request.code)) as LintDiagnostic[]
            self.postMessage({ kind: 'lint', id: request.id, diagnostics } satisfies WorkerResponse)
        } else {
            const describe = pyodide.globals.get('__describe_roboxlib') as () => string
            const classes = JSON.parse(describe()) as RoboxlibClass[]
            self.postMessage({ kind: 'describe', id: request.id, classes } satisfies WorkerResponse)
        }
    } catch (error) {
        console.error('Pyodide worker request failed', error)
        if (request.kind === 'lint') {
            self.postMessage({ kind: 'lint', id: request.id, diagnostics: [] } satisfies WorkerResponse)
        } else {
            self.postMessage({ kind: 'describe', id: request.id, classes: [] } satisfies WorkerResponse)
        }
    }
}
