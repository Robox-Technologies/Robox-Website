export type DiagnosticTransport = 'bluetooth' | 'usb'
export type DiagnosticStage =
    | 'chooser'
    | 'connect'
    | 'service'
    | 'characteristic'
    | 'notify'
    | 'write'
    | 'open'
    | 'selectConfiguration'
    | 'claimInterface'
    | 'transfer'
    | 'close'

export interface StageTaggedError extends Error {
    stage: DiagnosticStage
    transport?: DiagnosticTransport
    originalError?: unknown
}

export interface DiagnosticClassification {
    title: string
    cause: string
    fix: string
    severity: 'info' | 'warning' | 'error'
}

export interface PreflightIssue extends DiagnosticClassification {
    transport: DiagnosticTransport
    stage: 'preflight'
}

export interface PreflightReport {
    issues: PreflightIssue[]
    diagnostics: Record<string, unknown>
}

const bluetoothRules: Array<{
    stage: DiagnosticStage
    name: string
    hint?: string
    result: DiagnosticClassification
}> = [
    {
        stage: 'chooser',
        name: 'NotAllowedError',
        result: {
            title: 'Bluetooth access is blocked',
            cause: 'The site permission, browser policy, or required user gesture prevented the Bluetooth picker from opening.',
            fix: 'Reset this site’s permission from the lock icon and start Bluetooth connection directly from the Connect button. If the site is managed, contact your administrator.',
            severity: 'error',
        },
    },
    {
        stage: 'chooser',
        name: 'NotFoundError',
        hint: 'cancel',
        result: {
            title: 'Bluetooth picker was cancelled',
            cause: 'No device was selected.',
            fix: 'Choose the powered-on Ro/Box in the Bluetooth picker, or try again.',
            severity: 'info',
        },
    },
    {
        stage: 'chooser',
        name: 'NotFoundError',
        hint: 'adapter',
        result: {
            title: 'Bluetooth adapter is unavailable',
            cause: 'The browser cannot access a Bluetooth adapter, or Bluetooth is blocked for this browser.',
            fix: 'Turn Bluetooth on and enable this browser in System Settings → Privacy & Security → Bluetooth, then restart the browser.',
            severity: 'error',
        },
    },
    {
        stage: 'connect',
        name: 'NetworkError',
        result: {
            title: 'Ro/Box Bluetooth connection failed',
            cause: 'The module may be connected to another app, out of range, or affected by radio interference.',
            fix: 'Close other apps and browser tabs using the module, move closer, unplug USB 3 hubs, and power-cycle the Ro/Box.',
            severity: 'error',
        },
    },
    {
        stage: 'service',
        name: 'NotFoundError',
        result: {
            title: 'Ro/Box Bluetooth service was not found',
            cause: 'This may be a clone module with different UUIDs, a stale macOS GATT cache, or a service not advertised by the module.',
            fix: 'Power-cycle the module and toggle Bluetooth. If it still fails, remove the device in system Bluetooth settings and retry. Support alternate HM-10 UUIDs if this is a clone.',
            severity: 'error',
        },
    },
    {
        stage: 'notify',
        name: 'InvalidStateError',
        result: {
            title: 'Bluetooth notifications could not start',
            cause: 'Notifications were started twice or the module was not ready after reconnecting.',
            fix: 'Disconnect, wait a moment, and retry. The connection state must be rebuilt after every reconnect.',
            severity: 'warning',
        },
    },
    {
        stage: 'write',
        name: 'NetworkError',
        result: {
            title: 'Bluetooth write failed',
            cause: 'The module dropped the connection or rejected a packet.',
            fix: 'Keep packets at 20 bytes or fewer, queue writes, and retry after moving closer or power-cycling the module.',
            severity: 'error',
        },
    },
]

const usbRules: Array<{
    stage: DiagnosticStage
    name: string
    hint?: string
    result: DiagnosticClassification
}> = [
    {
        stage: 'chooser',
        name: 'NotAllowedError',
        result: {
            title: 'USB access is blocked',
            cause: 'The site permission, browser policy, or required user gesture prevented the USB picker from opening.',
            fix: 'Reset this site’s permission from the lock icon and start USB connection directly from the Connect button. If the site is managed, contact your administrator.',
            severity: 'error',
        },
    },
    {
        stage: 'open',
        name: 'SecurityError',
        hint: 'access denied',
        result: {
            title: 'Linux USB permission was denied',
            cause: 'The operating system did not grant this browser access to the device.',
            fix: 'Add a udev rule for the device vendor/product ID, replug the Ro/Box, and retry.',
            severity: 'error',
        },
    },
    {
        stage: 'claimInterface',
        name: 'SecurityError',
        result: {
            title: 'This USB interface is protected',
            cause: 'The operating system reserves this interface for HID, mass storage, audio, video, smart card, or another protected class.',
            fix: 'Use WebHID or Web Serial instead, or change the device firmware so the interface can be used by WebUSB.',
            severity: 'error',
        },
    },
    {
        stage: 'claimInterface',
        name: 'NetworkError',
        hint: 'unable to claim',
        result: {
            title: 'The USB interface is already claimed',
            cause: 'A kernel driver, another tab, or another application is using the interface.',
            fix: 'Close the other app or tab. On Linux, unbind the kernel driver; for CDC serial devices, use Web Serial instead.',
            severity: 'error',
        },
    },
    {
        stage: 'transfer',
        name: 'NetworkError',
        result: {
            title: 'USB transfer failed',
            cause: 'The transfer stalled, timed out, or the device was unplugged/reset.',
            fix: 'Clear the halt, reset or replug the device, then try another cable or port without a hub.',
            severity: 'error',
        },
    },
    {
        stage: 'open',
        name: 'InvalidStateError',
        result: {
            title: 'USB device is already open',
            cause: 'The device is in use by another connection.',
            fix: 'Close the other browser tab or application, then reconnect.',
            severity: 'warning',
        },
    },
]

export function stageWrap<T>(
    stage: DiagnosticStage,
    promise: Promise<T>,
    transport?: DiagnosticTransport,
): Promise<T> {
    return promise.catch((originalError: unknown) => {
        const errorLike = originalError as {
            name?: unknown
            message?: unknown
        }
        const message =
            typeof errorLike.message === 'string'
                ? errorLike.message
                : String(originalError)
        const error = new Error(message) as StageTaggedError
        error.name =
            typeof errorLike.name === 'string' ? errorLike.name : 'Error'
        error.stage = stage
        error.transport = transport
        error.originalError = originalError
        throw error
    })
}

export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message: string,
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(
                () =>
                    reject(
                        Object.assign(new Error(message), {
                            name: 'TimeoutError',
                        }),
                    ),
                timeoutMs,
            ),
        ),
    ])
}

export function classify(
    error: unknown,
    transport?: DiagnosticTransport,
): DiagnosticClassification {
    const candidate = error as Partial<StageTaggedError> & {
        name?: string
        message?: string
    }
    const stage = candidate.stage
    const original = candidate.originalError as
        { name?: unknown; message?: unknown } | undefined
    const name =
        (typeof candidate.name === 'string' && candidate.name !== 'Error'
            ? candidate.name
            : original?.name) ?? ''
    const message = (
        (typeof candidate.message === 'string' && candidate.message) ||
        (typeof original?.message === 'string' && original.message) ||
        ''
    ).toLowerCase()
    const rules =
        candidate.transport === 'bluetooth' || transport === 'bluetooth'
            ? bluetoothRules
            : usbRules
    const match = rules.find(
        (rule) =>
            rule.stage === stage &&
            rule.name === name &&
            (!rule.hint || message.includes(rule.hint)),
    )

    return (
        match?.result ?? {
            title: 'Connection could not be classified',
            cause: `${stage ?? 'unknown'} failed with ${name || 'an unknown error'}.`,
            fix: 'Copy diagnostics and share them with Ro/Box support.',
            severity: 'warning',
        }
    )
}

interface UserAgentData {
    brands?: Array<{ brand: string; version: string }>
    platform?: string
    getHighEntropyValues?: (
        hints: string[],
    ) => Promise<{ architecture?: string; platform?: string }>
}

function getUserAgentData(): UserAgentData | undefined {
    return (navigator as Navigator & { userAgentData?: UserAgentData })
        .userAgentData
}

export async function preflight(): Promise<PreflightReport> {
    const issues: PreflightIssue[] = []
    const bluetooth = 'bluetooth' in navigator ? navigator.bluetooth : null
    const usb = 'usb' in navigator ? navigator.usb : null
    const serial = 'serial' in navigator ? navigator.serial : null
    const bluetoothAvailable = bluetooth !== null
    const usbAvailable = usb !== null
    const serialAvailable = serial !== null
    const inIframe = window.self !== window.top
    const userAgentData = getUserAgentData()
    const architecture = await userAgentData?.getHighEntropyValues?.([
        'architecture',
    ])

    if (!window.isSecureContext) {
        issues.push({
            transport: bluetoothAvailable ? 'bluetooth' : 'usb',
            stage: 'preflight',
            title: 'The editor is not running securely',
            cause: 'Web Bluetooth, WebUSB, and Web Serial require a secure context.',
            fix: 'Load the editor over HTTPS or from localhost instead of plain HTTP.',
            severity: 'error',
        })
    }

    let bluetoothAvailability: boolean | string = 'unavailable'
    let bluetoothDevices: unknown = 'unavailable'
    const bluetoothGetAvailability =
        typeof bluetooth?.getAvailability === 'function'
    if (bluetoothGetAvailability) {
        try {
            bluetoothAvailability = await bluetooth!.getAvailability()
        } catch (error) {
            bluetoothAvailability = `error: ${String(error)}`
        }
        if (bluetoothAvailability === false) {
            issues.push({
                transport: 'bluetooth',
                stage: 'preflight',
                title: 'Bluetooth adapter is unavailable',
                cause: 'Bluetooth is switched off, no adapter is available, or the operating system is blocking this browser.',
                fix: 'Turn Bluetooth on and enable this browser in System Settings → Privacy & Security → Bluetooth.',
                severity: 'error',
            })
        }
    } else if (!bluetoothAvailable) {
        issues.push({
            transport: 'bluetooth',
            stage: 'preflight',
            title: 'Web Bluetooth is not available',
            cause: 'This browser does not expose Web Bluetooth.',
            fix: 'Use a supported Chromium browser over HTTPS, or switch to USB.',
            severity: 'error',
        })
    } else {
        issues.push({
            transport: 'bluetooth',
            stage: 'preflight',
            title: 'Web Bluetooth availability check is unavailable',
            cause: 'The browser exposes navigator.bluetooth but not its getAvailability() method.',
            fix: 'Use a supported Chromium browser and try the Connect button directly.',
            severity: 'warning',
        })
    }
    let usbDevices: unknown = 'unavailable'
    let serialPorts: unknown = 'unavailable'
    const usbGetDevices = typeof usb?.getDevices === 'function'
    if (usbGetDevices) {
        try {
            usbDevices = await usb!.getDevices()
        } catch (error) {
            usbDevices = `error: ${String(error)}`
        }
    }
    const serialGetPorts = typeof serial?.getPorts === 'function'
    if (serialGetPorts) {
        try {
            serialPorts = await serial!.getPorts()
        } catch (error) {
            serialPorts = `error: ${String(error)}`
        }
    }
    if (!usbAvailable && !serialAvailable) {
        issues.push({
            transport: 'usb',
            stage: 'preflight',
            title: 'USB connection APIs are not available',
            cause: 'This browser does not expose WebUSB or Web Serial.',
            fix: 'Use a supported Chromium browser over HTTPS, or switch to Bluetooth.',
            severity: 'error',
        })
    }
    if (usbAvailable && !usbGetDevices) {
        issues.push({
            transport: 'usb',
            stage: 'preflight',
            title: 'WebUSB device discovery is unavailable',
            cause: 'The browser exposes navigator.usb but not its getDevices() method.',
            fix: 'Use a supported Chromium browser and try the Connect button directly.',
            severity: 'warning',
        })
    }
    if (serialAvailable && !serialGetPorts) {
        issues.push({
            transport: 'usb',
            stage: 'preflight',
            title: 'Web Serial port discovery is unavailable',
            cause: 'The browser exposes navigator.serial but not its getPorts() method.',
            fix: 'Use a supported Chromium browser and try the Connect button directly.',
            severity: 'warning',
        })
    }
    if (inIframe && (bluetoothAvailable || usbAvailable || serialAvailable)) {
        issues.push({
            transport: bluetoothAvailable ? 'bluetooth' : 'usb',
            stage: 'preflight',
            title: 'Connection access may be blocked in this frame',
            cause: 'The editor is running inside an iframe without the required Bluetooth/USB permission policy.',
            fix: 'Load the editor as a top-level page or add allow="bluetooth; usb; serial" to the iframe.',
            severity: 'error',
        })
    }

    return {
        issues,
        diagnostics: {
            timestamp: new Date().toISOString(),
            stage: 'preflight',
            userAgent: navigator.userAgent,
            browser: userAgentData?.brands ?? navigator.userAgent,
            os: userAgentData?.platform ?? navigator.platform,
            architecture: architecture?.architecture ?? 'unavailable',
            isSecureContext: window.isSecureContext,
            inIframe,
            bluetooth: {
                available: bluetoothAvailable,
                getAvailability: bluetoothGetAvailability,
                availability: bluetoothAvailability,
                discoveredServices: 'not discovered until connection',
                devices: bluetoothDevices,
            },
            usb: {
                webUsbAvailable: usbAvailable,
                webSerialAvailable: serialAvailable,
                getDevices: usbGetDevices,
                getPorts: serialGetPorts,
                devices: usbDevices,
                ports: serialPorts,
                configurations: 'not discovered until connection',
                interfaces: 'not discovered until connection',
            },
        },
    }
}
