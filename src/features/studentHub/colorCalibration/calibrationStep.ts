import { pico } from '@/libs/communication/communicate'
import type { PaletteColorName } from '@/data/colorPalette'
import type { ColorReading, PicoEventMap, PicoState } from 'src/types/communication'
import { ConnectionStatus } from 'src/types/communication'
import {
    dispatchCalibrationAdvance,
    dispatchCalibrationClearError,
    dispatchCalibrationError,
} from './stage'

/**
 * Calibration involves an actual sensor read on the board, not just an
 * echoed command, so this is more generous than the firmware check's
 * timeout - long enough for a healthy board to genuinely finish before
 * being reported as unresponsive.
 */
const CALIBRATION_TIMEOUT_MS = 6000

export interface SwatchButton {
    name: PaletteColorName
    calibrateButton: HTMLButtonElement
    resetButton: HTMLButtonElement
    check: HTMLElement
    spinner: HTMLElement
}

export interface ColorCalibrationOptions {
    root: HTMLElement
    disconnectedButton: HTMLButtonElement
    swatchGrid: HTMLElement
    swatches: SwatchButton[]
    previewSwatch: HTMLElement
    previewName: HTMLElement
    previewRgb: HTMLElement
}

/**
 * Wires up the single calibrate stage: every one of the 8 colours has its
 * own calibrate/reset pair sitting next to the live colour-mode preview.
 * Every colour is independent - there's no forced order or wizard to step
 * through, and any colour can be (re)calibrated or reset on its own.
 */
export function wireColorCalibration(options: ColorCalibrationOptions): void {
    const { root, disconnectedButton, swatchGrid, swatches, previewSwatch, previewName, previewRgb } = options

    let waitingForResult = false
    let activeSwatch: SwatchButton | null = null
    /** Which of `activeSwatch`'s two actions is in flight, for the reply handler below. */
    let activeAction: 'calibrate' | 'reset' | null = null
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    // Colour mode is entered exactly once per connection, right as it
    // becomes available, rather than needing its own explicit step -
    // there's no other reason to be on this stage.
    let colorModeStarted = false

    function clearTimer() {
        if (timeoutHandle) clearTimeout(timeoutHandle)
        timeoutHandle = null
    }

    function setSwatchBusy(swatch: SwatchButton, busy: boolean) {
        swatch.calibrateButton.disabled = busy
        swatch.resetButton.disabled = busy
        swatch.spinner.classList.toggle('hidden!', !busy)
        if (busy) swatch.check.classList.add('hidden!')
    }

    function setInteractive(enabled: boolean) {
        for (const swatch of swatches) {
            swatch.calibrateButton.disabled = !enabled
            swatch.resetButton.disabled = !enabled
        }
    }

    function finish(after: () => void) {
        clearTimer()
        waitingForResult = false
        if (activeSwatch) setSwatchBusy(activeSwatch, false)
        activeSwatch = null
        activeAction = null
        setInteractive(true)
        // The calibrate/reset command just in flight is a COMMAND frame like
        // any other, and the board implicitly exits colour mode the instant
        // it receives one - there's no dedicated stop, any other command
        // does it. So the live preview needs a fresh colorMode() call to
        // resume streaming once this request's cycle is done, whether it
        // succeeded or was refused. Skipped when we're not even connected
        // any more (the disconnect branch below): there's nothing to send it
        // to, and reconnecting re-enters it on its own.
        if (pico.isConnected()) pico.colorMode()
        after()
    }

    // Reachable either by URL (a reload or a bookmark landing straight on
    // this stage) or by the Ro/Box dropping out mid-stage, not just by
    // arriving here normally from a successful Connect stage - so this
    // checks the connection itself rather than trusting it was already
    // verified upstream.
    function updateConnectionUI(state: PicoState) {
        const connected = state.connectionStatus === ConnectionStatus.CONNECTED
        if (!connected && waitingForResult) {
            // Nothing is going to answer a request sent to a Ro/Box that's
            // no longer there.
            finish(() => dispatchCalibrationClearError(root))
        }
        setInteractive(connected)
        swatchGrid.classList.toggle('hidden', !connected)
        disconnectedButton.classList.toggle('hidden', connected)

        if (connected && !colorModeStarted) {
            colorModeStarted = true
            pico.colorMode()
        } else if (!connected) {
            colorModeStarted = false
        }
    }

    pico.on('stateChange', updateConnectionUI)
    updateConnectionUI(pico.getState())

    pico.on('color', (reading: ColorReading) => {
        previewSwatch.style.backgroundColor = `rgb(${reading.r}, ${reading.g}, ${reading.b})`
        previewName.textContent = reading.name
        previewRgb.textContent = `rgb(${reading.r}, ${reading.g}, ${reading.b})`
    })

    // The reply names which colour/action just succeeded (e.g. "red" vs.
    // "red_reset"), but with only one request ever in flight, `activeSwatch`
    // and `activeAction` already know that - nothing here needs to parse it.
    pico.on('calibrated', () => {
        if (!waitingForResult) return
        const swatch = activeSwatch
        const action = activeAction
        finish(() => {
            dispatchCalibrationClearError(root)
            if (!swatch) return
            swatch.check.classList.toggle('hidden!', action !== 'calibrate')
        })
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
        // One request in flight at a time - a click on another swatch
        // mid-request can't start a second one racing the first's
        // timeout/reply against it.
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
        swatch.calibrateButton.addEventListener('click', () => {
            sendRequest(
                swatch,
                'calibrate',
                () => pico.colorCalibrate(swatch.name),
                `The Ro/Box didn't respond to the ${swatch.name} calibration request. Check that it's connected, then try again.`,
            )
        })

        swatch.resetButton.addEventListener('click', () => {
            sendRequest(
                swatch,
                'reset',
                () => pico.colorResetColor(swatch.name),
                `The Ro/Box didn't respond to the request to reset ${swatch.name}. Check that it's connected, then try again.`,
            )
        })
    }

    disconnectedButton.addEventListener('click', () => {
        dispatchCalibrationClearError(root)
        dispatchCalibrationAdvance(root, 'connect')
    })
}
