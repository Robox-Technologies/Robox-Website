import { pico } from '@/libs/communication/communicate'
import { toast } from '@/libs/ui/toast'
import type { PaletteColorName } from '@/data/colorPalette'
import type { ColorCalibration, ColorReading, PicoEventMap, PicoState } from 'src/types/communication'
import { ConnectionStatus } from 'src/types/communication'
import {
    dispatchCalibrationAdvance,
    dispatchCalibrationClearError,
    dispatchCalibrationError,
} from './stage'

/** More generous than the firmware check: calibration is a real sensor read, not an echo. */
const CALIBRATION_TIMEOUT_MS = 6000

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
    previewRgb: HTMLElement
}

/** Wires up the calibrate stage: one toggle per colour, calibrating or resetting depending on its current state. */
export function wireColorCalibration(options: ColorCalibrationOptions): void {
    const { root, swatches, previewSwatch, previewName, previewRgb } = options

    let waitingForResult = false
    let activeSwatch: SwatchButton | null = null
    /** Which of `activeSwatch`'s two actions is in flight, for the reply handler below. */
    let activeAction: 'calibrate' | 'reset' | null = null
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    // Colour mode is entered once per connection, as soon as it's available.
    let colorModeStarted = false

    // Tracks whether the current connection has already had its calibration
    // status fetched, so a `stateChange` firing for unrelated reasons while
    // still connected doesn't re-request it. Reset on every disconnect so
    // the next connection fetches fresh.
    let calibrationFetched = false

    function applySwatchState(swatch: SwatchButton, calibrated: boolean) {
        swatch.check.classList.toggle('hidden!', !calibrated)
        swatch.toggleButton.setAttribute('aria-checked', String(calibrated))
        swatch.toggleButton.title = calibrated
            ? `Reset ${swatch.name} to default`
            : `Calibrate ${swatch.name}`
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
        for (const swatch of swatches) {
            swatch.toggleButton.disabled = !enabled
        }
    }

    function finish(after: () => void) {
        clearTimer()
        waitingForResult = false
        if (activeSwatch) setSwatchBusy(activeSwatch, false)
        activeSwatch = null
        activeAction = null
        setInteractive(true)
        // Any COMMAND frame implicitly exits colour mode on the board, so the live
        // preview needs a fresh colorMode() once the request settles either way.
        if (pico.isConnected()) pico.colorMode()
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
            // Nothing is going to answer a request sent to a Ro/Box that's no longer there.
            if (waitingForResult) finish(() => {})
            colorModeStarted = false
            calibrationFetched = false
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
        if (!colorModeStarted) {
            colorModeStarted = true
            pico.colorMode()
        }

        // Fetched as soon as the board connects, in the background, rather
        // than only once this stage is visible - so the swatches already
        // reflect what's persisted on the board (e.g. from a previous
        // session) by the time anyone sees this panel, mirroring motor
        // calibration's fetch-on-connect.
        if (!calibrationFetched) {
            calibrationFetched = true
            pico.getCalibration('colors')
        }
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
        previewSwatch.style.backgroundColor = `rgb(${reading.r}, ${reading.g}, ${reading.b})`
        previewName.textContent = reading.name
        previewRgb.textContent = `rgb(${reading.r}, ${reading.g}, ${reading.b})`
    })

    // With one request in flight, `activeSwatch`/`activeAction` already say which
    // colour the reply is for, so its payload doesn't need parsing.
    pico.on('calibrated', () => {
        if (!waitingForResult) return
        const swatch = activeSwatch
        const action = activeAction
        finish(() => {
            dispatchCalibrationClearError(root)
            if (!swatch) return
            applySwatchState(swatch, action === 'calibrate')
        })
    })

    // The board's answer to getCalibration("colors") above - display only,
    // same reasoning as motor calibration's `calibration` handler: this must
    // never turn around and call pico.colorCalibrate()/colorResetColor(), or
    // a mere read would overwrite whatever's actually persisted on the board.
    pico.on('calibration', (data) => {
        if (data.name !== 'colors') return
        const value = data.value as ColorCalibration
        for (const swatch of swatches) {
            applySwatchState(swatch, value[swatch.name])
        }
    })

    pico.on('error', (data: PicoEventMap['error']) => {
        if (!waitingForResult) return
        finish(() => dispatchCalibrationError(root, 'Calibration Failed', data.message))
    })

    function sendRequest(
        swatch: SwatchButton,
        action: 'calibrate' | 'reset',
        send: () => void,
        failureMessage: string,
    ) {
        // One request in flight, so a click on another swatch can't race the first.
        if (waitingForResult) return

        dispatchCalibrationClearError(root)
        activeSwatch = swatch
        activeAction = action
        setSwatchBusy(swatch, true)
        setInteractive(false)
        waitingForResult = true
        send()

        clearTimer()
        timeoutHandle = setTimeout(() => {
            if (!waitingForResult) return
            finish(() => dispatchCalibrationError(root, 'Calibration Failed', failureMessage))
        }, CALIBRATION_TIMEOUT_MS)
    }

    for (const swatch of swatches) {
        swatch.toggleButton.addEventListener('click', () => {
            const isCalibrated = swatch.toggleButton.getAttribute('aria-checked') === 'true'
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
