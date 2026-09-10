import PyodideLintWorker from './pyodideLint.worker?worker'
import type { WorkerRequest, WorkerResponse, LintDiagnostic, RoboxlibClass } from './pyodideLint.worker'

export const runWhenIdle: (callback: () => void) => void =
    typeof window.requestIdleCallback === 'function'
        ? (callback) => window.requestIdleCallback(callback)
        : (callback) => window.setTimeout(callback, 1000)

// One worker (and the ~13MB Pyodide + roboxlib load it triggers) shared by
// both linting.ts and completion.ts, so opening the editor pays that cost
// at most once, not once per feature.
let worker: Worker | null = null
let nextRequestId = 0
const pendingLintCallbacks = new Map<number, (diagnostics: LintDiagnostic[]) => void>()
let pendingDescribeCallback: ((classes: RoboxlibClass[]) => void) | null = null

function getWorker(): Worker {
    worker ??= new PyodideLintWorker()
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data
        if (response.kind === 'lint') {
            pendingLintCallbacks.get(response.id)?.(response.diagnostics)
            pendingLintCallbacks.delete(response.id)
        } else {
            pendingDescribeCallback?.(response.classes)
            pendingDescribeCallback = null
        }
    }
    return worker
}

// Fire-and-forget: the caller decides whether/when a stale response (a
// newer request sent since) should still be applied.
export function requestLint(code: string, onResult: (diagnostics: LintDiagnostic[]) => void): number {
    const id = ++nextRequestId
    pendingLintCallbacks.set(id, onResult)
    getWorker().postMessage({ kind: 'lint', id, code } satisfies WorkerRequest)
    return id
}

export function cancelLint(id: number) {
    pendingLintCallbacks.delete(id)
}

let describePromise: Promise<RoboxlibClass[]> | null = null

// Only ever asked for once -- cached for the rest of the page's lifetime.
export function describeRoboxlib(): Promise<RoboxlibClass[]> {
    describePromise ??= new Promise((resolve) => {
        pendingDescribeCallback = resolve
        getWorker().postMessage({ kind: 'describe', id: ++nextRequestId } satisfies WorkerRequest)
    })
    return describePromise
}
