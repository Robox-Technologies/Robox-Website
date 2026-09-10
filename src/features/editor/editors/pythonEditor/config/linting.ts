import { editor, MarkerSeverity } from 'monaco-editor/editor/editor.api'
import type { editor as editorNamespace } from 'monaco-editor/editor/editor.api'
import PyodideLintWorker from '../workers/pyodideLint.worker?worker'
import type { LintRequest, LintResponse } from '../workers/pyodideLint.worker'

const MARKER_OWNER = 'pyodide-python'
const LINT_DEBOUNCE_MS = 400

const runWhenIdle: (callback: () => void) => void =
    typeof window.requestIdleCallback === 'function'
        ? (callback) => window.requestIdleCallback(callback)
        : (callback) => window.setTimeout(callback, 1000)

// Real Python syntax errors, plus argument-count/keyword checks for calls to
// builtins and the student's own top-level functions (via
// inspect.Signature.bind against the real signature -- same TypeError
// Python itself would raise). Method calls (`obj.method()`) aren't checked,
// since that needs knowing the type of `obj`. Runs off the main thread since
// spinning up Pyodide (a WASM CPython build) blocks for a few seconds on
// first use.
export function lintPythonModel(model: editorNamespace.ITextModel) {
    let worker: Worker | null = null
    let requestId = 0
    let latestSentId = 0
    let timeoutId = 0

    function getWorker(): Worker {
        if (worker) return worker
        worker = new PyodideLintWorker()
        worker.onmessage = (event: MessageEvent<LintResponse>) => {
            const { id, diagnostics } = event.data
            if (id !== latestSentId || model.isDisposed()) return

            const markers: editorNamespace.IMarkerData[] = diagnostics.map((d) => ({
                severity: MarkerSeverity.Error,
                message: d.message,
                startLineNumber: d.startLine,
                startColumn: d.startColumn,
                endLineNumber: d.endLine,
                endColumn: d.endColumn,
            }))
            editor.setModelMarkers(model, MARKER_OWNER, markers)
        }
        return worker
    }

    function sendLintRequest() {
        requestId += 1
        latestSentId = requestId
        getWorker().postMessage({
            id: requestId,
            code: model.getValue(),
        } satisfies LintRequest)
    }

    function scheduleLint() {
        window.clearTimeout(timeoutId)
        timeoutId = window.setTimeout(sendLintRequest, LINT_DEBOUNCE_MS)
    }

    model.onDidChangeContent(scheduleLint)

    // Defer the first lint -- and the worker + ~13MB Pyodide download it
    // creates -- until the browser is idle, so opening the editor doesn't
    // compete with that download. A reopened project with an existing error
    // still gets flagged, just once things have settled rather than instantly.
    runWhenIdle(sendLintRequest)
}
