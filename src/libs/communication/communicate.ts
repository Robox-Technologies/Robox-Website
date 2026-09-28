import type {
    Communication,
    PicoEventMap,
    CommunicationMethod,
    PicoState,
    PicoMessage,
    ColorReading,
    CalibrationReading,
} from 'src/types/communication'

import { ConnectionStatus, FirmwareStatus } from 'src/types/communication'
import { toast } from '@/libs/ui/toast'

import { USBCommunication } from './usb'
import { BluetoothCommunication } from './webBle'
import { IOSBluetoothCommunication } from './iosBle'
import {
    CALIBRATE_COLOR_COMMANDS,
    COMMANDS,
    GET_CALIBRATION_COMMANDS,
    MINIMUM_FIRMWARE_VERSION,
    RESET_COLOR_COMMANDS,
    SUPPORTED_PROTOCOL_VERSION,
    calibrateMotorsCommand,
    isValidDeviceName,
    meetsMinimumVersion,
    parseFirmwareReply,
    renameDeviceCommand,
    reverseMotorCommand,
    swapMotorsCommand,
    TEST_DRIVE_COMMANDS,
    type CalibrationName,
    type TestDriveDirection,
} from './protocol'
import type { PaletteColorName } from '@/data/colorPalette'
import { uploadProgram } from './uploader'
import { BaseTransport, delay, errorMessage } from './transportBase'
import type { BleDevice } from '@capacitor-community/bluetooth-le'

type PicoEventListener<K extends keyof PicoEventMap> = (
    data: PicoEventMap[K],
) => void

type PicoEventHandler = (data: unknown) => void

/** Generous: the board's send throttle plus chunked writes can push a reply past half a second. */
const FIRMWARE_CHECK_TIMEOUT_MS = 2500

/** How long to wait for the wire to actually drop before giving up on a bootloader-entry attempt. */
const BOOTLOADER_CONFIRM_TIMEOUT_MS = 3000
/**
 * How long to wait for the board's "renaming" ack - sent immediately, before
 * the AT09 module does anything disruptive, so this only needs to cover
 * normal send/pacing latency, not the whole AT sequence.
 */
const RENAME_TIMEOUT_MS = 3000

/**
 * After a rename, the AT09 module needs the link to stay down for its whole
 * AT sequence (~0.5s disconnect + ~0.3s name-set + 1.5s reset + up to 6s to
 * come back online, call it 10s) before it's safe to reconnect - retrying
 * sooner catches it mid-sequence and breaks it. Retried on an interval
 * rather than a single wait-then-try, since "online" isn't observable
 * up front.
 */
const RENAME_RECONNECT_INITIAL_DELAY_MS = 3000
const RENAME_RECONNECT_RETRY_INTERVAL_MS = 1500
const RENAME_RECONNECT_TOTAL_MS = 15000

const revertStateMapping: Partial<Record<ConnectionStatus, ConnectionStatus>> =
    {
        [ConnectionStatus.CONNECTING]: ConnectionStatus.DISCONNECTED,
        [ConnectionStatus.RESTARTING]: ConnectionStatus.CONNECTED,
        [ConnectionStatus.DISCONNECTING]: ConnectionStatus.DISCONNECTED,
    }

export class Pico {
    private communication: Communication | null
    private state: PicoState
    private listeners: Map<keyof PicoEventMap, Set<PicoEventHandler>>
    private firmwareCheckTimeout: ReturnType<typeof setTimeout> | null = null
    private responded: boolean = false
    private firmwareConfirmed: boolean = false
    private toastsEnabled: boolean = true

    /**
     * Set while `awaitBootloaderReboot` is waiting to see whether the board
     * actually rebooted. `disconnect()` resolves it - the wire dropping is
     * the only real proof bootsel engaged, since a board that silently
     * ignored the attempt (framed `BOOTLOADER` or the legacy REPL fallback
     * alike) looks identical up to this point.
     */
    private bootloaderRebootConfirmed: (() => void) | null = null

    /** Protocol the board speaks. 1 is the unframed legacy path. */
    private protocolVersion: number = 1

    /** Whether the program on the board arrived intact. Cleared when a new upload starts. */
    private uploadVerified: boolean = false
    private verifiedProgram: string | null = null

    /**
     * Lets a duplicate 'connect' join the attempt already running. A
     * `connectionStatus` check won't do: `request()` sets CONNECTING first.
     */
    private connectAttempt: Promise<void> | null = null

    /**
     * Whether a `colorCalibrate()`/`colorResetColor()`/`motorCalibrate()`/
     * `motorReverse()`/`motorSwap()`/`getCalibration()` reply is still
     * outstanding. The board answers a refused one (bad command name, no
     * sensor attached, out-of-range bias) with the same generic `error`
     * type a crashed user program gets, and this is what lets
     * `handleMessage` tell the two apart - without it, every rejected
     * calibration click would restart an otherwise healthy board. Not used
     * for `colorMode()`: unlike those, it has no dedicated success reply to
     * clear this on, so tracking it the same way would leave this stuck
     * true and silently swallow a real crash later.
     */
    private calibrationCommandPending: boolean = false

    /**
     * Tracks the promise returned by an outstanding `renameDevice()` call.
     * The board's immediate "renaming" ack - not its later "renamed"/"error",
     * which usually can't make it back before the AT09 module drops the link
     * - is what settles this.
     */
    private renameCommandPending: boolean = false
    private pendingRenameName: string | null = null
    private renameTimeout: ReturnType<typeof setTimeout> | null = null
    private renameSettle: {
        resolve: (name: string) => void
        reject: (error: Error) => void
    } | null = null

    /**
     * Set once a rename acks, cleared by the `disconnect()` it triggers -
     * which then reconnects to the same device instead of just sitting at
     * DISCONNECTED, since the module dropping the link is a required step
     * of the AT sequence, not a failure. Not set for USB: renaming always
     * targets the BLE module regardless of which interface issued it, so a
     * USB session never sees a disconnect from it in the first place.
     */
    private awaitingRenameReconnect: boolean = false

    constructor() {
        this.communication = null
        this.listeners = new Map()
        this.state = {
            connectionStatus: ConnectionStatus.DISCONNECTED,
            firmwareStatus: FirmwareStatus.UNKNOWN,
            firmwareVersion: '0.0.0',
            isRestarting: false,
            communicationMethod: null,
        }
    }

    // Public getters for state
    getState(): PicoState {
        return { ...this.state }
    }

    isConnected(): boolean {
        return this.state.connectionStatus === ConnectionStatus.CONNECTED
    }

    // Off for callers with their own inline connection feedback (e.g. flash device).
    setToastsEnabled(enabled: boolean): void {
        this.toastsEnabled = enabled
    }

    /** Whether reconnecting to a previously authorised port/device happens automatically. */
    setAutoConnect(enabled: boolean): void {
        this.communication?.setAutoConnect(enabled)
    }

    // Event listener management (for React hooks)
    on<K extends keyof PicoEventMap>(
        event: K,
        listener: PicoEventListener<K>,
    ): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        this.listeners.get(event)!.add(listener as PicoEventHandler)
    }

    off<K extends keyof PicoEventMap>(
        event: K,
        listener: PicoEventListener<K>,
    ): void {
        this.listeners.get(event)?.delete(listener as PicoEventHandler)
    }

    emit<K extends keyof PicoEventMap>(event: K, data: PicoEventMap[K]): void {
        // Emit toasts for error events only
        if (event === 'error' && this.toastsEnabled) {
            const errorData = data as { message: string }
            toast.danger({
                title: 'Ro/Box Error',
                message: errorData.message,
            })
        }
        this.listeners.get(event)?.forEach((listener) => listener(data))
    }

    revertConnectionState(): void {
        const revertedConnectionStatus =
            revertStateMapping[this.state.connectionStatus]

        if (!revertedConnectionStatus) return

        this.updateState({ connectionStatus: revertedConnectionStatus })
    }

    private updateState(updates: Partial<PicoState>): void {
        this.state = { ...this.state, ...updates }
        this.emit('stateChange', this.state)
    }

    async setCommunicationMethod(method: CommunicationMethod): Promise<void> {
        if (this.communication) {
            // Before the transport goes away: an interface can only be released over itself.
            await this.releaseBoard()
            await this.communication.destroy()
        }

        this.responded = false
        this.firmwareConfirmed = false
        this.protocolVersion = 2
        this.uploadVerified = false
        this.verifiedProgram = null
        this.calibrationCommandPending = false
        this.awaitingRenameReconnect = false
        this.settleRename(new Error('The Ro/Box disconnected.'))
        this.updateState({
            communicationMethod: method,
            connectionStatus: ConnectionStatus.DISCONNECTED,
            firmwareStatus: FirmwareStatus.UNKNOWN,
            isRestarting: false,
        })
        if (method === 'USB') {
            this.communication = new USBCommunication(this)
        } else if (method === 'WebBluetooth') {
            this.communication = new BluetoothCommunication(this)
        } else if (method === 'iOSBluetooth') {
            this.communication = new IOSBluetoothCommunication(this)
        }
        this.communication?.initialize()
    }

    async connect(
        port: SerialPort | BluetoothDevice | BleDevice,
    ): Promise<void> {
        const communication = this.communication
        if (!communication) {
            throw new Error('Communication method not set')
        }

        if (this.connectAttempt) return this.connectAttempt

        this.connectAttempt = this.attemptConnect(communication, port).finally(
            () => {
                this.connectAttempt = null
            },
        )

        return this.connectAttempt
    }

    private async attemptConnect(
        communication: Communication,
        port: SerialPort | BluetoothDevice | BleDevice,
    ): Promise<void> {
        this.updateState({ connectionStatus: ConnectionStatus.CONNECTING })

        try {
            await communication.connect(port)

            this.firmwareCheck()
        } catch (error) {
            this.revertConnectionState()
            this.emit('error', { message: errorMessage(error) })
        }
    }

    /** Guarded, because USB re-enumeration and flaky BLE report the same disconnect repeatedly. */
    async disconnect(): Promise<void> {
        // Fires even though `connectionStatus` is already DISCONNECTED by the
        // time a legacy-bootloader reboot actually drops the wire - that
        // early return below would otherwise swallow the one signal that
        // proves the reboot happened.
        this.bootloaderRebootConfirmed?.()
        this.bootloaderRebootConfirmed = null
        this.uploadVerified = false
        this.verifiedProgram = null

        if (!this.communication) return

        if (
            this.state.connectionStatus === ConnectionStatus.DISCONNECTING ||
            this.state.connectionStatus === ConnectionStatus.DISCONNECTED
        ) {
            return
        }

        this.updateState({ connectionStatus: ConnectionStatus.DISCONNECTING })

        // Read before teardown clears it: a rename acks with "renaming",
        // then this very disconnect fires as a required step of the AT
        // sequence, not a failure - so it's what triggers reconnecting to
        // the same device, rather than just sitting at DISCONNECTED.
        const reconnectAfterRename = this.awaitingRenameReconnect
        this.awaitingRenameReconnect = false

        try {
            await this.releaseBoard()

            this.responded = false
            this.firmwareConfirmed = false
            this.calibrationCommandPending = false
            this.clearFirmwareCheck()

            await this.communication.disconnect()
        } catch (error) {
            this.emit('error', { message: errorMessage(error) })
        } finally {
            this.updateState({
                connectionStatus: ConnectionStatus.DISCONNECTED,
                firmwareStatus: FirmwareStatus.UNKNOWN,
                isRestarting: false,
            })

            if (reconnectAfterRename) {
                void this.reconnectAfterRename()
            }
        }
    }

    /** A message from the board. Host-side failures go through `emit('error')` instead. */
    handleMessage(payload: PicoMessage): void {
        const { type } = payload
        const message = String(payload.message)

        // First message means we're connected
        if (!this.responded) {
            this.responded = true
        }

        if (type === 'firmware') {
            const { version, protocol } = parseFirmwareReply(message)
            this.firmwareConfirmed = true
            this.protocolVersion = protocol

            const usable =
                protocol >= SUPPORTED_PROTOCOL_VERSION &&
                meetsMinimumVersion(version, MINIMUM_FIRMWARE_VERSION)
            console.log(protocol, SUPPORTED_PROTOCOL_VERSION, version, MINIMUM_FIRMWARE_VERSION)

            if (!usable) {
                this.updateState({
                    firmwareStatus: FirmwareStatus.OUT_OF_DATE,
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareVersion: version,
                })
                void this.recoverViaLegacyBootloader(
                    `This Ro/Box is running firmware ${version}, and ${MINIMUM_FIRMWARE_VERSION} or newer is required. Please update it before uploading.`,
                )
                return
            }

            this.clearFirmwareCheck()
            this.updateState({
                firmwareStatus: FirmwareStatus.UP_TO_DATE,
                connectionStatus: ConnectionStatus.CONNECTED,
                firmwareVersion: version,
            })
            if (this.toastsEnabled) {
                toast.success({
                    title: 'Ro/Box Connected',
                    message: 'Your Ro/Box is connected and ready to run.',
                    durationMs: 3000,
                })
            }
        } else if (type === 'connect' && this.state.isRestarting) {
            this.updateState({
                connectionStatus: ConnectionStatus.CONNECTED,
                isRestarting: false,
            })
        } else if (type === 'console') {
            this.emit('console', { message })
        } else if (type === 'download') {
            // The board confirming it finished writing program.py.
            this.emit('downloaded', {})
        } else if (type === 'calibrated') {
            this.calibrationCommandPending = false
            this.emit('calibrated', { message })
        } else if (type === 'calibration') {
            // A structured { name, value } reply, not a string - use the
            // raw payload rather than the `message` coercion above.
            this.calibrationCommandPending = false
            this.emit('calibration', payload.message as CalibrationReading)
        } else if (type === 'color') {
            // A structured reading, so use the raw payload rather than the `message` coercion.
            this.emit('color', payload.message as ColorReading)
        } else if (type === 'uploaded') {
            this.emit('uploaded', payload.message)
        } else if (type === 'renaming') {
            // The reliable success signal, sent before the AT09 module does
            // anything disruptive - do not wait for "renamed" below, which
            // usually can't make it back before the link that would carry
            // it drops.
            this.settleRename(null)
        } else if (type === 'renamed') {
            // Arrives late, if at all, and by then this has almost always
            // already settled via "renaming" above - a harmless no-op then.
            this.settleRename(null)
        } else if (type === 'error') {
            // A refusal while the check is outstanding is the check's answer, not a crash.
            if (this.firmwareCheckPending()) {
                this.failFirmwareCheck(message)
                return
            }

            // Same story for a refused calibration/reset command (bad name,
            // no sensor attached): that's the request's answer, not a
            // crashed program, so it must not restart a board that never
            // stopped working - doing so would also kill whatever
            // colour-mode stream was already running.
            if (this.calibrationCommandPending) {
                this.calibrationCommandPending = false
                this.emit('error', { message })
                return
            }

            // Likewise, the AT09 module rejecting the rename (bad name,
            // config failure) is the request's own answer - the connection
            // is still alive, so this must not restart the board either.
            if (this.renameCommandPending) {
                this.settleRename(new Error(message))
                return
            }

            this.emit('error', { message })
            this.restart()
        }
    }

    /** Tell the board this client is done. Safe on every teardown path. */
    private async releaseBoard(): Promise<void> {
        await this.communication?.release()
    }

    /** True while the firmware check is still waiting for its answer. */
    private firmwareCheckPending(): boolean {
        return this.firmwareCheckTimeout !== null && !this.firmwareConfirmed
    }

    private clearFirmwareCheck(): void {
        if (!this.firmwareCheckTimeout) return

        clearTimeout(this.firmwareCheckTimeout)
        this.firmwareCheckTimeout = null
    }

    /** The board refused the firmware check, so leave the status UNKNOWN. */
    private failFirmwareCheck(reason: string): void {
        this.clearFirmwareCheck()
        this.updateState({
            connectionStatus: ConnectionStatus.DISCONNECTED,
            firmwareStatus: FirmwareStatus.UNKNOWN,
        })
        this.emit('error', {
            message: `The Ro/Box refused the connection: ${reason}. Turn it off and on again, then reconnect.`,
        })
    }

    private firmwareCheck(): void {
        this.updateState({ firmwareStatus: FirmwareStatus.CHECKING })
        this.write(COMMANDS.FIRMWARE_CHECK)

        this.firmwareCheckTimeout = setTimeout(() => {
            // Dropped first, so a later error reads as a board error, not this check's answer.
            this.firmwareCheckTimeout = null
            if (this.firmwareConfirmed) return

            if (this.responded) {
                // Not a firmware reply: pre-2.0.0 boards don't understand COMMAND frames.
                const message = `This Ro/Box did not report a usable firmware version. ${MINIMUM_FIRMWARE_VERSION} or newer is required, so please update it.`
                this.updateState({
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareStatus: FirmwareStatus.OUT_OF_DATE,
                })
                void this.recoverViaLegacyBootloader(message)
            } else {
                const message =
                    'Ro/Box did not respond to the firmware check! Please try disconnecting and reconnecting it. If this issue persists, try reflashing the Ro/Box.'
                this.updateState({
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareStatus: FirmwareStatus.NO_RESPONSE,
                })
                void this.recoverViaLegacyBootloader(message)
            }
        }, FIRMWARE_CHECK_TIMEOUT_MS)
    }

    /**
     * A failed firmware check only warrants the original failure message if
     * the legacy bootloader fallback couldn't get the board into bootloader
     * mode either - if it worked, the board is already rebooting to update
     * mode and there's nothing left for the student to act on.
     */
    private async recoverViaLegacyBootloader(
        failureMessage: string,
    ): Promise<void> {
        const rebooted = await this.tryLegacyBootloaderFallback()
        if (rebooted) {
            this.emit('bootloaderEntered', {})
            return
        }
        this.emit('error', { message: failureMessage })
    }

    /**
     * Races `disconnect()` confirming a bootloader-entry attempt actually
     * rebooted the board against a timeout. Set up before the write that
     * might trigger it - a board fast enough to reboot before this is
     * listening would otherwise have its confirmation dropped on the floor.
     */
    private awaitBootloaderReboot(): Promise<boolean> {
        const confirmed = new Promise<boolean>((resolve) => {
            this.bootloaderRebootConfirmed = () => resolve(true)
        })

        const timedOut = new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), BOOTLOADER_CONFIRM_TIMEOUT_MS)
        })

        return Promise.race([confirmed, timedOut]).finally(() => {
            this.bootloaderRebootConfirmed = null
        })
    }

    /**
     * Boards this build can't talk to won't understand the framed
     * `BOOTLOADER` command either, so a failed firmware check is their only
     * route into bootloader mode: interrupt whatever they're running and
     * drop into the REPL by hand, the way the pre-framed-protocol client
     * used to.
     *
     * Whether this actually worked can't be read off the writes themselves -
     * `machine.bootloader()` reboots the board asynchronously, so every write
     * up to and including it can succeed on a board that never reboots at
     * all (e.g. one stuck somewhere the REPL can't hear Ctrl-C). The wire
     * itself dropping, via `awaitBootloaderReboot`, is the only real proof.
     */
    private async tryLegacyBootloaderFallback(): Promise<boolean> {
        if (!(this.communication instanceof BaseTransport)) return false

        const confirmation = this.awaitBootloaderReboot()

        try {
            await this.communication.writeRaw(COMMANDS.KEYBOARD_INTERRUPT)
            await this.communication.writeRaw('import machine\r')
            await this.communication.writeRaw('machine.bootloader()\r')
        } catch {
            // A write failing here usually means the reboot already dropped the link.
        }

        return confirmation
    }

    write(command: string | string[]): void {
        this.communication?.write(command).catch((error) => {
            this.emit('error', { message: errorMessage(error) })
        })
    }

    restart(): void {
        this.updateState({
            connectionStatus: ConnectionStatus.RESTARTING,
            isRestarting: true,
        })
        void this.communication?.write(COMMANDS.RESTART)
    }

    /**
     * Reboots into bootloader mode and confirms it actually happened before
     * telling the caller anything - a `write()` resolving only means the
     * board received the command, not that it acted on it. Emits
     * `bootloaderEntered` once `disconnect()` proves the reboot went
     * through, or `error` if it didn't - there is no other way to find out.
     */
    async bootloaderMode(): Promise<void> {
        const confirmation = this.awaitBootloaderReboot()
        void this.communication?.write(COMMANDS.BOOTLOADER)

        if (await confirmation) {
            this.emit('bootloaderEntered', {})
        } else {
            this.emit('error', {
                message:
                    'Ro/Box did not reboot into bootloader mode. Try again, or follow the manual steps below.',
            })
        }
    }

    request(): void {
        this.updateState({ connectionStatus: ConnectionStatus.CONNECTING })
        this.communication?.request().catch(() => {
            if (this.toastsEnabled) {
                toast.warning({
                    title: 'Connection Cancelled',
                    message: 'Ro/Box connection was cancelled.',
                    durationMs: 5000,
                })
            }
        })
    }

    /** Calibrates one colour against a swatch. Independent per colour, but do white/black first. */
    colorCalibrate(name: PaletteColorName): void {
        this.calibrationCommandPending = true
        void this.communication?.write(CALIBRATE_COLOR_COMMANDS[name])
    }

    /** Clears one colour's calibration back to its default. */
    colorResetColor(name: PaletteColorName): void {
        this.calibrationCommandPending = true
        void this.communication?.write(RESET_COLOR_COMMANDS[name])
    }

    /**
     * Trims the left/right motor balance, from -1 (full left) to 1 (full
     * right). Persisted board-side in config.json and only picked up by the
     * next `Motors()` a user program creates - it does not affect a program
     * that's already running.
     */
    motorCalibrate(bias: number): void {
        this.calibrationCommandPending = true
        void this.communication?.write(calibrateMotorsCommand(bias))
    }

    /**
     * Sets one motor's spin direction. An absolute set, not a toggle - call
     * it with the direction you want, not "flip whatever it currently is".
     */
    motorReverse(index: 0 | 1, reversed: boolean): void {
        this.calibrationCommandPending = true
        void this.communication?.write(reverseMotorCommand(index, reversed))
    }

    /** Swaps which physical motor answers to "left" and "right". Also an absolute set. */
    motorSwap(swapped: boolean): void {
        this.calibrationCommandPending = true
        void this.communication?.write(swapMotorsCommand(swapped))
    }

    /**
     * Renames the board's AT09 Bluetooth module (firmware >=2.0.1). There is
     * no readback - the board doesn't report its own name back - so this
     * client's validated `name` is what gets shown as the result, not
     * anything parsed from a reply. Resolves on the board's immediate
     * "renaming" ack, sent before it does anything disruptive - not on the
     * later "renamed" reply, which is unreliable (see the `renaming` branch
     * of `handleMessage`). Rejects on a refused name or no response at all
     * within `RENAME_TIMEOUT_MS`. The disconnect that follows a successful
     * rename is handled separately, by `disconnect()`/`reconnectAfterRename()`.
     */
    renameDevice(name: string): Promise<string> {
        if (!isValidDeviceName(name)) {
            return Promise.reject(
                new Error(
                    'Device names must be 1-16 characters: letters, numbers, underscores, or hyphens only.',
                ),
            )
        }
        if (!this.isConnected()) {
            return Promise.reject(
                new Error('Connect your Ro/Box before renaming it.'),
            )
        }
        if (this.renameCommandPending) {
            return Promise.reject(new Error('A rename is already in progress.'))
        }

        return new Promise<string>((resolve, reject) => {
            this.renameCommandPending = true
            this.pendingRenameName = name
            this.renameSettle = { resolve, reject }
            this.renameTimeout = setTimeout(() => {
                this.settleRename(
                    new Error(
                        'Ro/Box did not respond to the rename request. Make sure it is connected and not mid-upload, then try again.',
                    ),
                )
            }, RENAME_TIMEOUT_MS)
            void this.communication?.write(renameDeviceCommand(name))
        })
    }

    /** Settles the outstanding `renameDevice()` call, if any. `error` null resolves with the requested name; otherwise rejects. */
    private settleRename(error: Error | null): void {
        if (!this.renameCommandPending) return

        if (this.renameTimeout) {
            clearTimeout(this.renameTimeout)
            this.renameTimeout = null
        }

        const settle = this.renameSettle
        const name = this.pendingRenameName
        this.renameCommandPending = false
        this.pendingRenameName = null
        this.renameSettle = null

        if (!settle || !name) return
        if (error) {
            settle.reject(error)
            return
        }

        // Not for USB: renaming always targets the BLE module regardless of
        // which interface issued it, so a USB session never sees a
        // disconnect from it, and there is nothing here to reconnect to.
        if (this.state.communicationMethod !== 'USB') {
            this.awaitingRenameReconnect = true
        }
        settle.resolve(name)
    }

    /**
     * Waits out the AT09 module's reset (see `RENAME_RECONNECT_*` above),
     * then rejoins the same already-permitted device - retrying on an
     * interval, since there's no signal for exactly when it's back online.
     * Silent on failure: this runs unprompted after a disconnect the user
     * didn't initiate, so surfacing a mid-retry error would read as a false
     * alarm; giving up quietly just leaves the ordinary "Connect to Ro/Box"
     * button for them to retry by hand.
     */
    private async reconnectAfterRename(): Promise<void> {
        const communication = this.communication
        if (!communication) return

        // Budgeted from now, not from the end of the initial delay - "up to
        // ~15s total" from the disconnect, not 15s of retries on top of it.
        const deadline = Date.now() + RENAME_RECONNECT_TOTAL_MS
        await delay(RENAME_RECONNECT_INITIAL_DELAY_MS)

        while (Date.now() < deadline) {
            // The user may have moved on - picked a different method,
            // connected some other way - since this loop started.
            if (
                this.communication !== communication ||
                this.state.connectionStatus !== ConnectionStatus.DISCONNECTED
            ) {
                return
            }

            this.updateState({ connectionStatus: ConnectionStatus.CONNECTING })

            try {
                await communication.reconnect()
                if (this.toastsEnabled) {
                    toast.success({
                        title: 'Ro/Box Reconnected',
                        message: "It's back online under its new name.",
                        durationMs: 3000,
                    })
                }
                this.firmwareCheck()
                return
            } catch {
                this.revertConnectionState()
                await delay(RENAME_RECONNECT_RETRY_INTERVAL_MS)
            }
        }
    }

    /**
     * Reads back a calibration value already persisted on the board,
     * without changing it. The reply arrives as a `calibration` event -
     * `{ name, value }` - rather than a return value, since it comes back
     * over the same async link as everything else.
     */
    getCalibration(name: CalibrationName): void {
        this.calibrationCommandPending = true
        void this.communication?.write(GET_CALIBRATION_COMMANDS[name])
    }

    /**
     * Test-drives the whole robot at a fixed speed in one direction, through
     * the board's normal `Motors.run_motors` pipeline - so it reflects
     * whatever bias/reverse/swap is currently set. A direct action like
     * `restart()` or `bootloaderMode()`, not a calibration value: no reply,
     * so no `calibrationCommandPending` guard either.
     */
    testDrive(direction: TestDriveDirection): void {
        void this.communication?.write(TEST_DRIVE_COMMANDS[direction])
    }

    /** Stops both motors. The board also calls this itself the instant a program starts, so a test-drive can never fight it for the pins. */
    stopMotors(): void {
        void this.communication?.write(COMMANDS.STOP_MOTORS)
    }

    /**
     * Puts the board into colour mode, where it streams periodic `color`
     * readings instead of running a program. There is no dedicated stop
     * command - any other command frame (including a fresh `colorMode()`
     * call, `runCode()`, `restart()`, ...) implicitly exits it on the board,
     * so nothing here needs to explicitly cancel a previous call.
     */
    colorMode(): void {
        void this.communication?.write(COMMANDS.COLOR_MODE)
    }

    /** Send a program and wait for the board to confirm it arrived intact. */
    async sendCode(code: string): Promise<void> {
        if (this.uploadVerified && this.verifiedProgram === code) return

        this.uploadVerified = false
        this.verifiedProgram = null

        if (!(this.communication instanceof BaseTransport)) {
            throw new Error('No communication method set')
        }

        if (this.protocolVersion < SUPPORTED_PROTOCOL_VERSION) {
            throw new Error(
                `This Ro/Box needs firmware ${MINIMUM_FIRMWARE_VERSION} or newer before you can upload to it.`,
            )
        }

        this.updateState({ connectionStatus: ConnectionStatus.LOADING })

        try {
            await uploadProgram(this.communication, code)
            this.uploadVerified = true
            this.verifiedProgram = code
        } catch (error) {
            this.updateState({ connectionStatus: ConnectionStatus.CONNECTED })
            this.emit('error', { message: errorMessage(error) })
            throw error
        }
    }

    async sendAndRunCode(code: string): Promise<void> {
        await this.sendCode(code)
        this.runCode()
    }

    runCode(): void {
        if (!this.uploadVerified) {
            this.emit('error', {
                message:
                    'Your program has not been sent to the Ro/Box yet, so there is nothing to run.',
            })
            return
        }

        void this.communication?.write(COMMANDS.START_PROGRAM)
        this.updateState({ connectionStatus: ConnectionStatus.RUNNING })
    }
}

export const pico = new Pico()
