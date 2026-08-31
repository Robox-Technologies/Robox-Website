/**
 * Generic building blocks for a small multi-step page: child components
 * report progress upward by dispatching namespaced custom events on their
 * own root (bubbles: true), so the orchestrator - an ancestor in the DOM -
 * can react without knowing anything about the component internally.
 *
 * Shared by every page built this way (UF2 flashing, colour calibration, ...)
 * so they all get the same height-animated stage switching, error banner,
 * and URL-backed stage persistence for free.
 */

export function dispatchStageAdvance<S extends string>(
    target: EventTarget,
    namespace: string,
    stage: S,
): void {
    target.dispatchEvent(
        new CustomEvent(`${namespace}:advance`, { detail: { stage }, bubbles: true }),
    )
}

export function dispatchStageError(
    target: EventTarget,
    namespace: string,
    title: string,
    message: string,
): void {
    target.dispatchEvent(
        new CustomEvent(`${namespace}:error`, { detail: { title, message }, bubbles: true }),
    )
}

export function dispatchStageClearError(target: EventTarget, namespace: string): void {
    target.dispatchEvent(new CustomEvent(`${namespace}:clear-error`, { bubbles: true }))
}

export interface StageFlowOptions<S extends string> {
    /** The flow's own container - stage components dispatch on this, and it's what `stageStepper.astro` looks for via `[data-stage-flow-root]`. */
    root: HTMLElement
    /** Event prefix (e.g. `"flashdevice"`) - keeps this flow's events from colliding with another one elsewhere on the page. */
    namespace: string
    stages: readonly S[]
    isStage: (value: unknown) => value is S
    /** Query param that persists the active stage across reload and responds to back/forward. Omit to skip URL syncing. */
    stageParam?: string
}

/**
 * Wires up `.stageFlowStages` / `.stageFlowStage[data-stage]` / `.stageFlowError`
 * (with `.stageFlowErrorTitle` / `.stageFlowErrorMessage`) found inside `root`:
 * height-animated show/hide between stage panels, and the
 * `${namespace}:advance` / `:error` / `:clear-error` event contract.
 */
export function createStageFlow<S extends string>(options: StageFlowOptions<S>): void {
    const { root, namespace, stages, isStage, stageParam } = options

    const stagesWrapper = root.querySelector<HTMLElement>('.stageFlowStages')
    const stageElements = Array.from(root.querySelectorAll<HTMLElement>('.stageFlowStage'))
    const errorBanner = root.querySelector<HTMLElement>('.stageFlowError')
    const errorTitle = root.querySelector<HTMLElement>('.stageFlowErrorTitle')
    const errorMessage = root.querySelector<HTMLElement>('.stageFlowErrorMessage')
    if (!stagesWrapper || !errorBanner || !errorTitle || !errorMessage) {
        throw new Error('Stage flow elements not found')
    }

    function stageFromURL(): S {
        if (!stageParam) return stages[0]
        const value = new URLSearchParams(window.location.search).get(stageParam)
        return isStage(value) ? value : stages[0]
    }

    function urlForStage(stage: S): string {
        const url = new URL(window.location.href)
        url.searchParams.set(stageParam!, stage)
        return url.toString()
    }

    function showStage(stage: S, animate = true) {
        if (!animate) {
            stageElements.forEach((el) => el.classList.toggle('hidden', el.dataset.stage !== stage))
            stagesWrapper!.style.height = ''
            root.dispatchEvent(new CustomEvent(`${namespace}:stage-changed`, { detail: { stage } }))
            return
        }

        const fromHeight = stagesWrapper!.offsetHeight
        stagesWrapper!.style.height = `${fromHeight}px`
        void stagesWrapper!.offsetHeight
        stageElements.forEach((el) => el.classList.toggle('hidden', el.dataset.stage !== stage))
        root.dispatchEvent(new CustomEvent(`${namespace}:stage-changed`, { detail: { stage } }))
        const activeStage = stageElements.find((el) => el.dataset.stage === stage)
        const toHeight = activeStage?.scrollHeight ?? fromHeight
        stagesWrapper!.style.height = `${toHeight}px`
        stagesWrapper!.addEventListener('transitionend', () => { stagesWrapper!.style.height = '' }, { once: true })
    }

    root.addEventListener(`${namespace}:advance`, (event) => {
        errorBanner.style.display = 'none'
        const stage = (event as CustomEvent<{ stage: S }>).detail.stage
        showStage(stage)
        if (stageParam) history.pushState({ stage }, '', urlForStage(stage))
    })

    root.addEventListener(`${namespace}:error`, (event) => {
        const { title, message } = (event as CustomEvent<{ title: string; message: string }>).detail
        errorTitle.textContent = title
        errorMessage.textContent = message
        errorBanner.style.display = 'flex'
    })

    root.addEventListener(`${namespace}:clear-error`, () => {
        errorBanner.style.display = 'none'
    })

    const initialStage = stageFromURL()
    if (stageParam) history.replaceState({ stage: initialStage }, '', urlForStage(initialStage))
    showStage(initialStage, false)

    if (stageParam) {
        window.addEventListener('popstate', (event) => {
            const state = event.state as { stage?: unknown } | null
            showStage(isStage(state?.stage) ? state.stage : stages[0])
        })
    }
}
