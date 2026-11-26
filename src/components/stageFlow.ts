/**
 * Building blocks for a multi-step page. Child components dispatch namespaced
 * bubbling events on their own root; an ancestor orchestrates stage switching
 * and URL-backed stage persistence. Errors are toasts, not part of the flow.
 */

export function dispatchStageAdvance<S extends string>(
    target: EventTarget,
    namespace: string,
    stage: S,
): void {
    target.dispatchEvent(
        new CustomEvent(`${namespace}:advance`, {
            detail: { stage },
            bubbles: true,
        }),
    )
}

export interface StageFlowOptions<S extends string> {
    /** The flow's container, marked `[data-stage-flow-root]`; stage components dispatch on it. */
    root: HTMLElement
    /** Event prefix, e.g. `"flashdevice"`, so two flows on a page don't collide. */
    namespace: string
    stages: readonly S[]
    isStage: (value: unknown) => value is S
    /** Query param the active stage syncs to. Omit to skip URL syncing. */
    stageParam?: string
}

/**
 * Wires the `.stageFlow*` elements inside `root` to the
 * `${namespace}:advance` event contract.
 */
export function createStageFlow<S extends string>(
    options: StageFlowOptions<S>,
): void {
    const { root, namespace, stages, isStage, stageParam } = options

    const stagesWrapper = root.querySelector<HTMLElement>('.stageFlowStages')
    const stageElements = Array.from(
        root.querySelectorAll<HTMLElement>('.stageFlowStage'),
    )
    if (!stagesWrapper) throw new Error('Stage flow elements not found')

    function stageFromURL(): S {
        if (!stageParam) return stages[0]
        const value = new URLSearchParams(window.location.search).get(
            stageParam,
        )
        return isStage(value) ? value : stages[0]
    }

    function urlForStage(stage: S): string {
        const url = new URL(window.location.href)
        url.searchParams.set(stageParam!, stage)
        return url.toString()
    }

    function showStage(stage: S, animate = true) {
        if (!animate) {
            stageElements.forEach((el) => {
                const active = el.dataset.stage === stage
                el.classList.toggle('hidden', !active)
                el.style.display = active ? '' : 'none'
            })
            stagesWrapper!.style.height = ''
            root.dispatchEvent(
                new CustomEvent(`${namespace}:stage-changed`, {
                    detail: { stage },
                }),
            )
            return
        }

        const fromHeight = stagesWrapper!.offsetHeight
        stagesWrapper!.style.height = `${fromHeight}px`
        void stagesWrapper!.offsetHeight
        stageElements.forEach((el) => {
            const active = el.dataset.stage === stage
            el.classList.toggle('hidden', !active)
            el.style.display = active ? '' : 'none'
        })
        root.dispatchEvent(
            new CustomEvent(`${namespace}:stage-changed`, {
                detail: { stage },
            }),
        )
        const activeStage = stageElements.find(
            (el) => el.dataset.stage === stage,
        )
        const toHeight = activeStage?.scrollHeight ?? fromHeight
        stagesWrapper!.style.height = `${toHeight}px`
        stagesWrapper!.addEventListener(
            'transitionend',
            () => {
                stagesWrapper!.style.height = ''
            },
            { once: true },
        )
    }

    root.addEventListener(`${namespace}:advance`, (event) => {
        const stage = (event as CustomEvent<{ stage: S }>).detail.stage
        showStage(stage)
        if (stageParam) history.pushState({ stage }, '', urlForStage(stage))
    })


    const initialStage = stageFromURL()
    if (stageParam)
        history.replaceState(
            { stage: initialStage },
            '',
            urlForStage(initialStage),
        )
    showStage(initialStage, false)

    if (stageParam) {
        window.addEventListener('popstate', (event) => {
            const state = event.state as { stage?: unknown } | null
            showStage(isStage(state?.stage) ? state.stage : stages[0])
        })
    }
}
