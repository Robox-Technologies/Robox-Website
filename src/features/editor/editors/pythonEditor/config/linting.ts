import { editor, MarkerSeverity } from 'monaco-editor/editor/editor.api'
import type { editor as editorNamespace } from 'monaco-editor/editor/editor.api'
import { requestLint, runWhenIdle } from '../workers/pyodideWorkerClient'

const MARKER_OWNER = 'pyodide-python'
const LINT_DEBOUNCE_MS = 400

// Real Python syntax errors, plus argument-count/keyword checks for calls to
// builtins, roboxlib class constructors, the student's own top-level
// functions, and methods on the base preamble's instances (via
// inspect.Signature.bind against the real signature -- same TypeError
// Python itself would raise). Runs off the main thread since spinning up
// Pyodide (a WASM CPython build) blocks for a few seconds on first use.
export function lintPythonModel(model: editorNamespace.ITextModel) {
    let latestRequestId = 0
    let timeoutId = 0

    function sendLintRequest() {
        const id = requestLint(model.getValue(), (diagnostics) => {
            // A newer request may have been sent (and answered) while this
            // one was in flight -- its response is stale, ignore it so it
            // can't clobber markers a later, more current check already set.
            if (id !== latestRequestId || model.isDisposed()) return

            const markers: editorNamespace.IMarkerData[] = diagnostics.map((d) => ({
                severity: MarkerSeverity.Error,
                message: d.message,
                startLineNumber: d.startLine,
                startColumn: d.startColumn,
                endLineNumber: d.endLine,
                endColumn: d.endColumn,
            }))
            editor.setModelMarkers(model, MARKER_OWNER, markers)
        })
        latestRequestId = id
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
