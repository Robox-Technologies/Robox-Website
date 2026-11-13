import { pico } from '@/libs/communication/communicate'
import { setButtonBusy } from '@/components/busyButton'
import {
    dispatchStageAdvance,
    dispatchStageClearError,
    dispatchStageError,
} from '@/components/stageFlow'
import {
    ConnectionStatus,
    FirmwareStatus,
    type CommunicationMethod,
    type PicoState,
} from 'src/types/communication'
import { controllerLink } from './protocol/controllerLink'

const NAMESPACE = 'controller'

export interface ControllerConnectOptions {
    root: HTMLElement
    button: HTMLButtonElement
    label: HTMLElement
    isIOSBuild: boolean
}

function errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

/**
 * Connect stage: the usual connect + firmware check, then the controller
 * handshake. Only advances once the board has answered in controller mode.
 */
export function wireControllerConnect(options: ControllerConnectOptions): void {
    const { root, button, label, isIOSBuild } = options

    if (isIOSBuild) void pico.setCommunicationMethod('iOSBluetooth')

    /** One automatic attempt per connection; after a failure the button retries. */
    let attempted = false
    let starting = false

    function updateUI(state: PicoState = pico.getState()) {
        const connecting =
            state.connectionStatus === ConnectionStatus.CONNECTING
        setButtonBusy(button, connecting || starting)
        if (!connecting && !starting)
            button.disabled = !state.communicationMethod
        label.textContent = pico.isConnected()
            ? 'Start Controller'
            : 'Connect to Ro/Box'
    }

    async function startController() {
        if (starting || controllerLink.state !== 'idle') return

        starting = true
        attempted = true
        updateUI()
        dispatchStageClearError(root, NAMESPACE)

        try {
            await controllerLink.start()
            dispatchStageAdvance(root, NAMESPACE, 'drive')
        } catch (error) {
            dispatchStageError(
                root,
                NAMESPACE,
                'Controller Unavailable',
                errorText(error),
            )
        } finally {
            starting = false
            updateUI()
        }
    }

    pico.on('stateChange', (state) => {
        const ready =
            state.connectionStatus === ConnectionStatus.CONNECTED &&
            state.firmwareStatus === FirmwareStatus.UP_TO_DATE &&
            !state.rawMode

        if (state.connectionStatus === ConnectionStatus.DISCONNECTED)
            attempted = false
        if (ready && !attempted) void startController()
        updateUI(state)
    })

    pico.on('error', (data) => {
        if (controllerLink.active) return
        dispatchStageError(root, NAMESPACE, "Couldn't Connect", data.message)
    })

    button.addEventListener('click', () => {
        dispatchStageClearError(root, NAMESPACE)
        if (pico.isConnected()) {
            void startController()
        } else {
            pico.request()
        }
    })

    updateUI()

    const params = new URLSearchParams(window.location.search)
    const handoffMethod = params.get('connectionMethod') as Exclude<
        CommunicationMethod,
        null
    > | null
    const handoffDeviceId = params.get('deviceId')
    if (handoffMethod && handoffDeviceId) {
        button.disabled = true
        void (async () => {
            try {
                await pico.setCommunicationMethod(handoffMethod)
                await pico.autoConnect(handoffDeviceId)
            } catch (error) {
                dispatchStageAdvance(root, NAMESPACE, 'connect')
                dispatchStageError(
                    root,
                    NAMESPACE,
                    "Couldn't Connect",
                    errorText(error),
                )
            }
        })()
    }
}
