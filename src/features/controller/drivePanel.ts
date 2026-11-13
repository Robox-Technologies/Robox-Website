import { pico } from '@/libs/communication/communicate'
import {
    dispatchStageAdvance,
    dispatchStageError,
} from '@/components/stageFlow'
import { controllerLink, type LinkState } from './protocol/controllerLink'
import { DriveLoop, type DriveFrame } from './drive/driveLoop'
import { DEFAULT_MIX } from './drive/mixer'
import { JoystickInput } from './drive/inputs/joystick'
import { KeyboardInput } from './drive/inputs/keyboard'
import { GamepadInput } from './drive/inputs/gamepad'

const NAMESPACE = 'controller'
const SPEED_STORAGE_KEY = 'robox:controller:maxSpeed'

export interface DrivePanelOptions {
    root: HTMLElement
    joystick: HTMLElement
    knob: HTMLElement
    hint: HTMLElement
    stopButton: HTMLButtonElement
    speed: HTMLInputElement
    speedReadout: HTMLElement
    leftBar: HTMLElement
    leftValue: HTMLElement
    rightBar: HTMLElement
    rightValue: HTMLElement
    linkDot: HTMLElement
    linkStatus: HTMLElement
    returnLink: HTMLAnchorElement
    returnLabel: HTMLElement
}

const LINK_DOT_CLASSES: Record<LinkState, string> = {
    idle: 'bg-tone3',
    starting: 'bg-blue',
    active: 'bg-green',
    unresponsive: 'bg-yellow',
    closing: 'bg-tone3',
}

function readStoredSpeed(): string | null {
    try {
        return localStorage.getItem(SPEED_STORAGE_KEY)
    } catch {
        return null
    }
}

function storeSpeed(value: string): void {
    try {
        localStorage.setItem(SPEED_STORAGE_KEY, value)
    } catch {
        // Storage can be unavailable (private mode); the default is fine.
    }
}

function isTyping(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) &&
        !(target instanceof HTMLInputElement && target.type === 'range')
    )
}

export function wireDrivePanel(options: DrivePanelOptions): void {
    const {
        root,
        joystick: joystickBase,
        knob,
        hint,
        stopButton,
        speed,
        speedReadout,
        linkDot,
        linkStatus,
        returnLink,
        returnLabel,
    } = options

    const flowRoot = root.closest<HTMLElement>('[data-stage-flow-root]')
    const stageElement = root.closest<HTMLElement>('.stageFlowStage')
    if (!flowRoot || !stageElement)
        throw new Error('Drive panel must sit inside the controller stage flow')

    const joystick = new JoystickInput(joystickBase, knob)
    const gamepad = new GamepadInput()
    const keyboard = new KeyboardInput()

    // === speed ===

    const storedSpeed = readStoredSpeed()
    if (storedSpeed) speed.value = storedSpeed
    const maxSpeed = () => Number(speed.value) / 100
    const showSpeed = () => {
        speedReadout.textContent = `${speed.value}%`
    }
    speed.addEventListener('input', () => {
        showSpeed()
        storeSpeed(speed.value)
    })
    showSpeed()

    // === motor readout ===

    let lastLeft = NaN
    let lastRight = NaN
    function showMotor(bar: HTMLElement, label: HTMLElement, value: number) {
        const width = Math.abs(value) / 2
        bar.style.width = `${width}%`
        bar.style.left = value >= 0 ? '50%' : `${50 - width}%`
        label.textContent = String(value)
    }
    function showFrame(frame: DriveFrame) {
        if (frame.left !== lastLeft) {
            lastLeft = frame.left
            showMotor(options.leftBar, options.leftValue, frame.left)
        }
        if (frame.right !== lastRight) {
            lastRight = frame.right
            showMotor(options.rightBar, options.rightValue, frame.right)
        }
    }

    const loop = new DriveLoop({
        link: controllerLink,
        sources: [joystick, keyboard, gamepad],
        mix: () => ({ ...DEFAULT_MIX, maxSpeed: maxSpeed() }),
        onFrame: showFrame,
    })

    function emergencyStop() {
        joystick.release()
        loop.emergencyStop()
    }

    stopButton.addEventListener('click', emergencyStop)
    window.addEventListener('keydown', (event) => {
        if (event.code !== 'Space' || !onDriveStage() || isTyping(event.target))
            return
        event.preventDefault()
        emergencyStop()
    })

    // === gamepad hint ===

    const defaultHint = hint.textContent
    const showGamepad = () => {
        const name = gamepad.connectedName()
        hint.textContent = name
            ? `Gamepad connected: ${name}. Space stops.`
            : defaultHint
    }
    window.addEventListener('gamepadconnected', showGamepad)
    window.addEventListener('gamepaddisconnected', showGamepad)

    // === link status ===

    function showLink() {
        const state = controllerLink.state
        Object.values(LINK_DOT_CLASSES).forEach((name) =>
            linkDot.classList.remove(name),
        )
        linkDot.classList.add(LINK_DOT_CLASSES[state])

        const method =
            pico.getState().communicationMethod === 'USB' ? 'USB' : 'Bluetooth'
        const { rttMs, lossPercent, watchdogTripped } = controllerLink.stats()

        if (state === 'unresponsive') {
            linkStatus.textContent = 'Ro/Box not responding'
        } else if (state === 'active') {
            const parts = [`Connected over ${method}`]
            if (rttMs !== null) parts.push(`${rttMs} ms`)
            if (lossPercent) parts.push(`${lossPercent}% lost`)
            if (watchdogTripped) parts.push('signal dropped')
            linkStatus.textContent = parts.join(' · ')
        } else {
            linkStatus.textContent = 'Not connected'
        }
    }

    // === stage lifecycle ===

    let leaving = false

    function onDriveStage(): boolean {
        return (
            stageElement!.style.display !== 'none' &&
            !stageElement!.classList.contains('hidden')
        )
    }

    function sync() {
        if (onDriveStage() && controllerLink.active) {
            loop.start()
        } else {
            loop.stop()
        }
        showLink()
    }

    flowRoot.addEventListener(`${NAMESPACE}:stage-changed`, () => {
        if (onDriveStage() && !controllerLink.active) {
            dispatchStageAdvance(root, NAMESPACE, 'connect')
            return
        }
        // Back on the connect stage: hand the board back to the framed protocol.
        if (!onDriveStage() && controllerLink.active)
            void controllerLink.close()
        sync()
    })

    controllerLink.on('state', (state) => {
        sync()
        if (state !== 'idle' || leaving || !onDriveStage()) return
        dispatchStageAdvance(root, NAMESPACE, 'connect')
        dispatchStageError(
            root,
            NAMESPACE,
            'Controller Stopped',
            'The connection to your Ro/Box was lost. Reconnect to keep driving.',
        )
    })
    controllerLink.on('stats', showLink)

    // Landing straight on ?step=drive has no link yet.
    if (onDriveStage() && !controllerLink.active) {
        dispatchStageAdvance(root, NAMESPACE, 'connect')
    }
    sync()

    // === leaving ===

    const projectId = new URLSearchParams(window.location.search).get('id')
    if (projectId) {
        const url = new URL('/hub/editor/index.html', window.location.origin)
        url.searchParams.set('id', projectId)
        returnLink.href = url.toString()
        returnLabel.textContent = 'Return to Project'
    }

    returnLink.addEventListener('click', (event) => {
        event.preventDefault()
        leaving = true
        loop.stop()
        void controllerLink.close().finally(() => {
            const url = new URL(returnLink.href, window.location.href)
            const handoff = pico.getConnectionHandoff()
            if (projectId && handoff) {
                url.searchParams.set('connectionMethod', handoff.method)
                url.searchParams.set('deviceId', handoff.deviceId)
            }
            window.location.assign(url.toString())
        })
    })
}
