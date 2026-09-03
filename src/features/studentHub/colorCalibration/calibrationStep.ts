import { pico } from '@/libs/communication/communicate'
import type { PaletteColorName } from '@/data/colorPalette'
import type { ColorReading, PicoEventMap, PicoState } from 'src/types/communication'
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

/** Wires up the calibrate stage: a calibrate/reset pair per colour, each independent. */
export function wireColorCalibration(options: ColorCalibrationOptions): void {
    const { root, disconnectedButton, swatchGrid, swatches, previewSwatch, previewName, previewRgb } = options

    let waitingForResult = false
    let activeSwatch: SwatchButton | null = null
    /** Which of `activeSwatch`'s two actions is in flight, for the reply handler below. */
    let activeAction: 'calibrate' | 'reset' | null = null
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    // Colour mode is entered once per connection, as soon as it's available.
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
        // Any COMMAND frame implicitly exits colour mode on the board, so the live
        // preview needs a fresh colorMode() once the request settles either way.
        if (pico.isConnected()) pico.colorMode()
        after()
    }

    // Reachable by URL or after a mid-stage disconnect, so check the connection here
    // rather than trusting the Connect stage ran.
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

    // With one request in flight, `activeSwatch`/`activeAction` already say which
    // colour the reply is for, so its payload doesn't need parsing.
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
