import { pico } from '@/libs/communication/communicate'
import type { PicoState, MotorCalibration } from 'src/types/communication'
import { ConnectionStatus } from 'src/types/communication'
import {
    dispatchCalibrationAdvance,
    dispatchCalibrationClearError,
} from './stage'

export interface MotorCalibrationOptions {
    root: HTMLElement
    /** Everything the calibrate stage shows only while actually connected - hidden, not just disabled, when it isn't. */
    controls: HTMLElement
    disconnectedButton: HTMLButtonElement
    leftLine: HTMLElement
    rightLine: HTMLElement
    slider: HTMLInputElement
    readout: HTMLElement
    reverseLeftToggle: HTMLElement
    reverseRightToggle: HTMLElement
    swapToggle: HTMLElement
    testLeftButton: HTMLButtonElement
    testRightButton: HTMLButtonElement
    testStopButton: HTMLButtonElement
    resetButton: HTMLButtonElement
}

/**
 * Wires up the single calibrate stage: the left/right bias slider, the
 * reverse and swap toggles, and the test-drive buttons, all against a live
 * connection - `updateConnectionUI` below hides the whole panel rather than
 * just disabling pieces of it the moment that connection drops, since a
 * dropped connection here (unlike colour calibration's independent
 * per-swatch requests) would otherwise leave a bias slider showing a value
 * nothing can act on.
 */
export function wireMotorCalibration(options: MotorCalibrationOptions): void {
    const {
        root,
        controls,
        disconnectedButton,
        leftLine,
        rightLine,
        slider,
        readout,
        reverseLeftToggle,
        reverseRightToggle,
        swapToggle,
        testLeftButton,
        testRightButton,
        testStopButton,
        resetButton,
    } = options

    const describeBias = (bias: number) => {
        if (bias === 0) return 'Balanced'
        const percent = Math.round(Math.abs(bias) * 100)
        return `${percent}% ${bias < 0 ? 'Left' : 'Right'}`
    }

    /**
     * The favoured side's connecting line flows faster and brighter, the
     * other side settles back to a slow idle - so the "electricity" reads
     * as flowing more strongly toward whichever motor is being boosted.
     *
     * Speed is driven by hand in `tick` below, in pixels/second, rather than
     * a CSS `animation-duration` - changing that mid-animation resyncs the
     * animation's internal clock and makes it visibly stutter.
     */
    const MIN_SPEED_PX_S = 15
    const MAX_SPEED_PX_S = 60
    const MIN_INTENSITY = 0.3
    const MAX_INTENSITY = 1

    let leftFavor = 0
    let rightFavor = 0

    const favorToSpeed = (favor: number) =>
        MIN_SPEED_PX_S + favor * (MAX_SPEED_PX_S - MIN_SPEED_PX_S)

    const applyFavor = (line: HTMLElement, favor: number) => {
        const intensity = MIN_INTENSITY + favor * (MAX_INTENSITY - MIN_INTENSITY)
        line.style.setProperty('--intensity', String(intensity))
    }

    const updateDiagram = (bias: number) => {
        leftFavor = bias < 0 ? -bias : 0
        rightFavor = bias > 0 ? bias : 0
        applyFavor(leftLine, leftFavor)
        applyFavor(rightLine, rightFavor)
    }

    const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
    ).matches

    let leftOffsetPx = 0
    let rightOffsetPx = 0
    let lastFrameTime: number | null = null
    let animationFrame: number | null = null

    const tick = (time: number) => {
        if (lastFrameTime === null) lastFrameTime = time
        const deltaSeconds = (time - lastFrameTime) / 1000
        lastFrameTime = time

        // Left flows out towards the left motor (negative), right flows
        // out towards the right motor (positive).
        leftOffsetPx -= favorToSpeed(leftFavor) * deltaSeconds
        rightOffsetPx += favorToSpeed(rightFavor) * deltaSeconds

        leftLine.style.backgroundPosition = `${leftOffsetPx}px 0`
        rightLine.style.backgroundPosition = `${rightOffsetPx}px 0`

        animationFrame = requestAnimationFrame(tick)
    }

    const startFlowAnimation = () => {
        if (prefersReducedMotion || animationFrame !== null) return
        lastFrameTime = null
        animationFrame = requestAnimationFrame(tick)
    }

    const stopFlowAnimation = () => {
        if (animationFrame === null) return
        cancelAnimationFrame(animationFrame)
        animationFrame = null
    }

    const setBias = (bias: number) => {
        slider.value = String(bias)
        readout.textContent = describeBias(bias)
        updateDiagram(bias)
    }

    const isToggled = (toggle: HTMLElement) =>
        toggle.getAttribute('aria-checked') === 'true'

    const setToggle = (toggle: HTMLElement, checked: boolean) => {
        toggle.setAttribute('aria-checked', String(checked))
    }

    // Tracks whether the current connection has already had its motor trim
    // fetched, so a `stateChange` firing for unrelated reasons (firmware
    // status, isRestarting, ...) while still connected doesn't re-request
    // it. Reset on every disconnect so the next connection fetches fresh.
    let calibrationFetched = false

    // Reachable either by URL (a reload or a bookmark landing straight on
    // this stage) or by the Ro/Box dropping out mid-stage, not just by
    // arriving here normally from a successful Connect stage - so this
    // checks the connection itself rather than trusting it was already
    // verified upstream.
    function updateConnectionUI(state: PicoState) {
        const connected = state.connectionStatus === ConnectionStatus.CONNECTED
        controls.classList.toggle('hidden', !connected)
        disconnectedButton.classList.toggle('hidden', connected)

        if (!connected) {
            calibrationFetched = false
            stopFlowAnimation()
            return
        }

        startFlowAnimation()

        // Fetched as soon as the board connects, in the background, rather
        // than when this stage becomes visible - fetching then meant the
        // slider sat wherever it last was and then visibly jumped once the
        // reply arrived. Fetching here means it's already in place by the
        // time anyone sees this panel.
        if (!calibrationFetched) {
            calibrationFetched = true
            pico.getCalibration('motors')
        }
    }

    pico.on('stateChange', updateConnectionUI)
    updateConnectionUI(pico.getState())
    updateDiagram(Number(slider.value))

    // The board's answer to getCalibration("motors") above - display only,
    // same as setBias/setToggle themselves: this must never turn around and
    // call pico.motorCalibrate()/motorReverse()/motorSwap(), or a mere read
    // would overwrite whatever's actually persisted on the board with what
    // it just told us.
    pico.on('calibration', (data) => {
        if (data.name !== 'motors') return
        const value = data.value as MotorCalibration
        setBias(value.bias)
        setToggle(reverseLeftToggle, value.reverse[0])
        setToggle(reverseRightToggle, value.reverse[1])
        setToggle(swapToggle, value.swap)
    })

    slider.addEventListener('input', () => {
        const bias = Number(slider.value)
        readout.textContent = describeBias(bias)
        updateDiagram(bias)
    })

    // "change" (fires on release), not "input" (fires continuously while
    // dragging): the board only ever needs the final value, and firmware
    // doesn't live-apply this anyway - it's picked up by the next
    // `Motors()` a user program creates.
    slider.addEventListener('change', () => {
        pico.motorCalibrate(Number(slider.value))
    })

    reverseLeftToggle.addEventListener('click', () => {
        const reversed = !isToggled(reverseLeftToggle)
        setToggle(reverseLeftToggle, reversed)
        pico.motorReverse(0, reversed)
    })

    reverseRightToggle.addEventListener('click', () => {
        const reversed = !isToggled(reverseRightToggle)
        setToggle(reverseRightToggle, reversed)
        pico.motorReverse(1, reversed)
    })

    swapToggle.addEventListener('click', () => {
        const swapped = !isToggled(swapToggle)
        setToggle(swapToggle, swapped)
        pico.motorSwap(swapped)
    })

    testLeftButton.addEventListener('click', () => pico.runMotor(0))
    testRightButton.addEventListener('click', () => pico.runMotor(1))
    testStopButton.addEventListener('click', () => pico.stopMotors())

    resetButton.addEventListener('click', () => {
        setBias(0)
        pico.motorCalibrate(0)

        setToggle(reverseLeftToggle, false)
        pico.motorReverse(0, false)

        setToggle(reverseRightToggle, false)
        pico.motorReverse(1, false)

        setToggle(swapToggle, false)
        pico.motorSwap(false)

        pico.stopMotors()
    })

    disconnectedButton.addEventListener('click', () => {
        dispatchCalibrationClearError(root)
        dispatchCalibrationAdvance(root, 'connect')
    })

    // Unlike the old in-editor modal, leaving this page tears down the
    // whole connection - but not whatever motor was test-driven, since
    // that's driven by the board's own firmware, not by this tab staying
    // open. Best-effort: covers the back button, closing the tab, and
    // typing a new URL, not just the in-page "Back to Editor" click.
    window.addEventListener('pagehide', () => {
        pico.stopMotors()
    })
}
