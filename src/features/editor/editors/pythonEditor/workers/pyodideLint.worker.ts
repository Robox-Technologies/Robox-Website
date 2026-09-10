import { loadPyodide, type PyodideInterface } from 'pyodide'
import {
    HARDWARE_STUBS,
    ROBOXLIB_SETUP,
    LINT_SETUP,
    type LintDiagnostic,
} from './pyodideCheckSetup'

export type { LintDiagnostic }

export type LintRequest = {
    id: number
    code: string
}

export type LintResponse = {
    id: number
    diagnostics: LintDiagnostic[]
}

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
        return pyodide
    })
    return pyodidePromise
}

self.onmessage = async (event: MessageEvent<LintRequest>) => {
    const { id, code } = event.data
    try {
        const pyodide = await getPyodide()
        const lint = pyodide.globals.get('__lint') as (source: string) => string
        const diagnostics = JSON.parse(lint(code)) as LintDiagnostic[]
        self.postMessage({ id, diagnostics } satisfies LintResponse)
    } catch (error) {
        console.error('Pyodide lint failed', error)
        self.postMessage({ id, diagnostics: [] } satisfies LintResponse)
    }
}
