import { pico } from '@/libs/communication/communicate'
import { toast } from '@/libs/ui/toast'
import type { PicoState, MotorCalibration } from 'src/types/communication'
import { ConnectionStatus } from 'src/types/communication'
import { dispatchCalibrationAdvance, dispatchCalibrationReady } from './stage'

export interface MotorCalibrationOptions {
    root: HTMLElement
    leftLine: HTMLElement
    rightLine: HTMLElement
    slider: HTMLInputElement
    readout: HTMLElement
    reverseLeftToggle: HTMLElement
    reverseRightToggle: HTMLElement
    swapToggle: HTMLElement
    testForwardButton: HTMLButtonElement
    testBackwardButton: HTMLButtonElement
    testLeftButton: HTMLButtonElement
    testRightButton: HTMLButtonElement
    testStopButton: HTMLButtonElement
    resetButton: HTMLButtonElement
}

/**
 * Wires up the single calibrate stage: the left/right bias slider, the
 * reverse and swap toggles, and the test-drive buttons, all against a live
 * connection - a dropped connection here (unlike colour calibration's
 * independent per-swatch requests) would otherwise leave a bias slider
 * showing a value nothing can act on, so `updateConnectionUI` below sends
 * the student straight back to the Connect stage instead of trying to
 * degrade this one in place.
 */
export function wireMotorCalibration(options: MotorCalibrationOptions): void {
    const {
        root,
        leftLine,
        rightLine,
        slider,
        readout,
        reverseLeftToggle,
        reverseRightToggle,
        swapToggle,
        testForwardButton,
        testBackwardButton,
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

    // Whether this stage has seen a real connection since it mounted - lets
    // the disconnect handling below skip the "Ro/Box Disconnected" message
    // for the initial synchronous call (arriving here disconnected, e.g.
    // straight off a URL, isn't a drop worth alarming anyone about).
    let wasConnected = false

    // A dropped connection here (unlike colour calibration's independent
    // per-swatch requests) would leave a bias slider showing a value
    // nothing can act on, so this sends the student straight back to the
    // Connect stage rather than trying to degrade this one in place.
    function updateConnectionUI(state: PicoState) {
        const connected = state.connectionStatus === ConnectionStatus.CONNECTED

        if (!connected) {
            stopFlowAnimation()
            if (wasConnected) {
                toast.danger({
                    title: 'Ro/Box Disconnected',
                    message: 'Your Ro/Box lost its connection. Reconnect it, then calibrate again.',
                    durationMs: 6000,
                })
            }
            wasConnected = false
            dispatchCalibrationAdvance(root, 'connect')
            return
        }

        wasConnected = true
        startFlowAnimation()
    }

    pico.on('stateChange', updateConnectionUI)
    // Deferred: this stage's script can run before the page's own
    // `createStageFlow` script has registered its `advance` listener - both
    // are separate module scripts that mount back to back, so redirecting
    // synchronously here (e.g. landing on this stage via URL while
    // disconnected) would dispatch into a listener that doesn't exist yet
    // and silently go nowhere. A macrotask later, every script on the page
    // has finished mounting.
    setTimeout(() => updateConnectionUI(pico.getState()), 0)
    updateDiagram(Number(slider.value))

    // The board's answer to getCalibration("motors"), fetched by the Connect
    // stage before advancing here - display only, same as setBias/setToggle
    // themselves: this must never turn around and call
    // pico.motorCalibrate()/motorReverse()/motorSwap(), or a mere read would
    // overwrite whatever's actually persisted on the board with what it just
    // told us. Reports back with `dispatchCalibrationReady` once applied, so
    // the Connect stage - which can't otherwise tell this panel has caught
    // up - knows it's safe to reveal this stage without a flash of the
    // default "nothing calibrated" state.
    pico.on('calibration', (data) => {
        if (data.name !== 'motors') return
        const value = data.value as MotorCalibration
        setBias(value.bias)
        setToggle(reverseLeftToggle, value.reverse[0])
        setToggle(reverseRightToggle, value.reverse[1])
        setToggle(swapToggle, value.swap)
        dispatchCalibrationReady(root)
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

    testForwardButton.addEventListener('click', () => pico.testDrive('forward'))
    testBackwardButton.addEventListener('click', () =>
        pico.testDrive('backward'),
    )
    testLeftButton.addEventListener('click', () => pico.testDrive('left'))
    testRightButton.addEventListener('click', () => pico.testDrive('right'))
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

    // Unlike the old in-editor modal, leaving this page tears down the
    // whole connection - but not whatever motor was test-driven, since
    // that's driven by the board's own firmware, not by this tab staying
    // open. Best-effort: covers the back button, closing the tab, and
    // typing a new URL.
    window.addEventListener('pagehide', () => {
        pico.stopMotors()
    })
}
