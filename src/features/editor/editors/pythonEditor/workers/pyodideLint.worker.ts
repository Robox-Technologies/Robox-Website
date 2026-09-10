import { loadPyodide, type PyodideInterface } from 'pyodide'

export type LintRequest = {
    id: number
    code: string
}

export type LintDiagnostic = {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
    message: string
}

export type LintResponse = {
    id: number
    diagnostics: LintDiagnostic[]
}

// Defined once per worker so linting a keystroke only calls into an already-
// compiled Python function instead of recompiling this source every time.
const LINT_SETUP = `
import json

def __lint(source):
    try:
        compile(source, "<student>", "exec")
        return "[]"
    except SyntaxError as e:
        line = e.lineno or 1
        col = e.offset or 1
        return json.dumps([{
            "startLine": line,
            "startColumn": col,
            "endLine": e.end_lineno or line,
            "endColumn": max((e.end_offset or col) , col + 1),
            "message": e.msg,
        }])
`

let pyodidePromise: Promise<PyodideInterface> | null = null

function getPyodide(): Promise<PyodideInterface> {
    pyodidePromise ??= loadPyodide({ indexURL: '/hub/pyodide/' }).then((pyodide) => {
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
