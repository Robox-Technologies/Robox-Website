import { pico } from '@/libs/communication/communicate'
import { toast } from '@/libs/ui/toast'
import type { PaletteColorName } from '@/data/colorPalette'
import type {
    ColorCalibration,
    ColorReading,
    PicoState,
} from 'src/types/communication'
import { ConnectionStatus } from 'src/types/communication'
import { createCalibrationStage, debugCalibration } from '../stage'

const {
    dispatchAdvance: dispatchCalibrationAdvance,
    dispatchReady: dispatchCalibrationReady,
} = createCalibrationStage('colorcalibration')
const debug = (message: string, details?: unknown) =>
    debugCalibration('colorcalibration', message, details)

/** More generous than the firmware check: calibration is a real sensor read, not an echo. */
const CALIBRATION_TIMEOUT_MS = 6000

/** Every other colour is read through the brightness scale these two set. */
const BASE_COLOURS: readonly PaletteColorName[] = ['white', 'black']

export interface SwatchButton {
    name: PaletteColorName
    toggleButton: HTMLButtonElement
    check: HTMLElement
    spinner: HTMLElement
}

export interface ColorCalibrationOptions {
    root: HTMLElement
    swatches: SwatchButton[]
    previewSwatch: HTMLElement
    previewName: HTMLElement
}

/** Wires up the calibrate stage: one toggle per colour, calibrating or resetting depending on its current state. */
export function wireColorCalibration(options: ColorCalibrationOptions): void {
    const { root, swatches, previewSwatch, previewName } = options
    debug('Colour calibration stage mounted', {
        swatchCount: swatches.length,
    })

    let waitingForResult = false
    let activeSwatch: SwatchButton | null = null
    /** Which of `activeSwatch`'s two actions is in flight, for the reply handler below. */
    let activeAction: 'calibrate' | 'reset' | null = null
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    // Colour mode itself is started by the Connect stage, which won't advance
    // here until it has proven the sensor works. Set when the board later
    // refuses it (sensor unplugged mid-session) and cleared by the next
    // reading, so a failed request doesn't re-send colorMode() just to be
    // refused - and toasted - a second time.
    let colorModeRefused = false

    // Only true while this stage is the one on screen - the Connect stage
    // disconnects on purpose when its sensor check fails, and that's not a
    // drop worth a "Ro/Box Disconnected" toast.
    const stageElement = root.closest<HTMLElement>('.stageFlowStage')
    function isActiveStage(): boolean {
        return !stageElement?.classList.contains('hidden')
    }

    const isCalibrated = (swatch: SwatchButton) =>
        swatch.toggleButton.getAttribute('aria-checked') === 'true'

    const baseCalibrated = () =>
        swatches
            .filter((swatch) => BASE_COLOURS.includes(swatch.name))
            .every(isCalibrated)

    // Other colours wait for white and black. One already calibrated stays
    // clickable, so it can still be reset.
    function isLocked(swatch: SwatchButton): boolean {
        if (BASE_COLOURS.includes(swatch.name) || isCalibrated(swatch)) return false
        return !baseCalibrated()
    }

    // The "start with white and black" instruction only matters until they're done.
    const baseHint = root.querySelector<HTMLElement>('.calibrationBaseHint')

    let interactive = true
    function refreshLocks() {
        baseHint?.classList.toggle('hidden', baseCalibrated())
        for (const swatch of swatches) {
            const locked = isLocked(swatch)
            swatch.toggleButton.toggleAttribute('data-locked', locked)
            swatch.toggleButton.disabled = !interactive || locked
            swatch.toggleButton.title = locked
                ? 'Calibrate white and black first'
                : isCalibrated(swatch)
                  ? `Reset ${swatch.name} to default`
                  : `Calibrate ${swatch.name}`
        }
    }

    function applySwatchState(swatch: SwatchButton, calibrated: boolean) {
        swatch.check.classList.toggle('hidden!', !calibrated)
        swatch.toggleButton.setAttribute('aria-checked', String(calibrated))
        refreshLocks()
    }

    function clearTimer() {
        if (timeoutHandle) clearTimeout(timeoutHandle)
        timeoutHandle = null
    }

    function setSwatchBusy(swatch: SwatchButton, busy: boolean) {
        swatch.toggleButton.disabled = busy
        swatch.spinner.classList.toggle('hidden!', !busy)
        if (busy) swatch.check.classList.add('hidden!')
    }

    function setInteractive(enabled: boolean) {
        interactive = enabled
        refreshLocks()
    }

    function finish(after: () => void, succeeded = false) {
        clearTimer()
        waitingForResult = false
        if (activeSwatch) setSwatchBusy(activeSwatch, false)
        activeSwatch = null
        activeAction = null
        setInteractive(true)
        // Any COMMAND frame implicitly exits colour mode on the board, so the live
        // preview needs a fresh colorMode() once the request settles - unless
        // the board has already refused it and this request didn't change that.
        if (pico.isConnected() && (succeeded || !colorModeRefused)) {
            pico.colorMode()
        }
        after()
    }

    // Whether this stage has seen a real connection since it mounted - lets
    // the disconnect handling below skip the "Ro/Box Disconnected" toast for
    // the initial synchronous call (arriving here disconnected, e.g.
    // straight off a URL, isn't a drop worth alarming anyone about).
    let wasConnected = false

    // A dropped connection here sends the student straight back to the
    // Connect stage rather than degrading this one in place - with one
    // request in flight per swatch and no way to act on a stale preview,
    // there's nothing worth keeping this stage around for.
    function updateConnectionUI(state: PicoState) {
        const connected = state.connectionStatus === ConnectionStatus.CONNECTED

        if (!connected) {
            const connectionWasActive = wasConnected
            debug('Colour calibration connection lost', {
                previousConnection: connectionWasActive,
                status: state.connectionStatus,
            })
            // Nothing is going to answer a request sent to a Ro/Box that's no longer there.
            if (waitingForResult) finish(() => {})
            colorModeRefused = false
            if (wasConnected && isActiveStage()) {
                toast.danger({
                    title: 'Ro/Box Disconnected',
                    message:
                        'Your Ro/Box lost its connection. Reconnect it, then calibrate again.',
                    durationMs: 6000,
                })
            }
            wasConnected = false
            if (connectionWasActive && isActiveStage()) {
                dispatchCalibrationAdvance(root, 'connect')
            }
            return
        }

        wasConnected = true
        debug('Colour calibration connection ready')
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

    pico.on('color', (reading: ColorReading) => {
        colorModeRefused = false
        previewSwatch.style.backgroundColor = `rgb(${reading.r}, ${reading.g}, ${reading.b})`
        previewName.textContent = reading.name
    })

    // With one request in flight, `activeSwatch`/`activeAction` already say which
    // colour the reply is for, so its payload doesn't need parsing.
    pico.on('calibrated', () => {
        if (!waitingForResult) return
        const swatch = activeSwatch
        const action = activeAction
        finish(() => {
            if (!swatch) return
            applySwatchState(swatch, action === 'calibrate')
        }, true)
    })

    // The board's answer to getCalibration("colors"), fetched by the Connect
    // stage before advancing here - display only, same reasoning as motor
    // calibration's `calibration` handler: this must never turn around and
    // call pico.colorCalibrate()/colorResetColor(), or a mere read would
    // overwrite whatever's actually persisted on the board. Reports back
    // with `dispatchCalibrationReady` once applied, so the Connect stage -
    // which can't otherwise tell these swatches have caught up - knows it's
    // safe to reveal this stage without a flash of the default "nothing
    // calibrated" state.
    pico.on('calibration', (data) => {
        if (data.name !== 'colors') return
        debug('Received persisted colour calibration')
        const value = data.value as ColorCalibration
        for (const swatch of swatches) {
            applySwatchState(swatch, value[swatch.name])
        }
        dispatchCalibrationReady(root)
    })

    // pico already toasts every error with the board's own message, so these
    // only settle state - a banner on top would just repeat it.
    pico.on('error', () => {
        if (!isActiveStage()) return
        if (!waitingForResult) {
            // Outside a request, this is the board refusing colorMode().
            colorModeRefused = true
            return
        }
        finish(() => {})
    })

    function sendRequest(
        swatch: SwatchButton,
        action: 'calibrate' | 'reset',
        send: () => void,
        failureMessage: string,
    ) {
        // One request in flight, so a click on another swatch can't race the first.
        if (waitingForResult) return

        debug(`Sending colour ${action} request`, { colour: swatch.name })

        activeSwatch = swatch
        activeAction = action
        setSwatchBusy(swatch, true)
        setInteractive(false)
        waitingForResult = true
        send()

        clearTimer()
        timeoutHandle = setTimeout(() => {
            if (!waitingForResult) return
            finish(() =>
                toast.danger({
                    title: 'Calibration Failed',
                    message: failureMessage,
                }),
            )
        }, CALIBRATION_TIMEOUT_MS)
    }

    refreshLocks()

    for (const swatch of swatches) {
        swatch.toggleButton.addEventListener('click', () => {
            const isCalibrated =
                swatch.toggleButton.getAttribute('aria-checked') === 'true'
            if (isCalibrated) {
                sendRequest(
                    swatch,
                    'reset',
                    () => pico.colorResetColor(swatch.name),
                    `The Ro/Box didn't respond to the request to reset ${swatch.name}. Check that it's connected, then try again.`,
                )
            } else {
                sendRequest(
                    swatch,
                    'calibrate',
                    () => pico.colorCalibrate(swatch.name),
                    `The Ro/Box didn't respond to the ${swatch.name} calibration request. Check that it's connected, then try again.`,
                )
            }
        })
    }
}
