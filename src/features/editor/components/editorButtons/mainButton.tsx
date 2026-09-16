import Button from '@/components/button'
import { usePico } from '@/features/editor/hooks/usePico'
import { ConnectionStatus } from 'src/types/communication'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { twMerge } from 'tailwind-merge'

const statusStyling: Record<
    ConnectionStatus,
    { className: string; children: React.ReactNode }
> = {
    [ConnectionStatus.CONNECTED]: {
        className: 'bg-green',
        children: 'Run Ro/Box',
    },
    [ConnectionStatus.CONNECTING]: {
        className: 'bg-blue',
        children: <FontAwesomeIcon icon={faSpinner} spin />,
    },
    [ConnectionStatus.DISCONNECTED]: {
        className: 'bg-blue',
        children: 'Connect to Ro/Box',
    },
    [ConnectionStatus.DISCONNECTING]: {
        className: 'bg-blue',
        children: <FontAwesomeIcon icon={faSpinner} spin />,
    },
    [ConnectionStatus.RESTARTING]: {
        className: 'bg-red',
        children: <FontAwesomeIcon icon={faSpinner} spin />,
    },
    [ConnectionStatus.LOADING]: {
        className: 'bg-red',
        children: <FontAwesomeIcon icon={faSpinner} spin />,
    },
    [ConnectionStatus.RUNNING]: {
        className: 'bg-red',
        children: 'Stop Ro/Box',
    },
}
export default function MainButton() {
    const {
        connectionStatus,
        communicationMethod,
        isFirmwareOutOfDate,
        connect,
        restart,
        sendCode,
        runCode,
    } = usePico()

    // A failed firmware check drops connectionStatus back to DISCONNECTED
    // (see communicate.ts), so this is the state that actually means
    // "board found, but too old to talk to" - send the user to the flash
    // page instead of leaving them stuck on "Connect to Ro/Box".
    const needsFirmwareUpdate =
        connectionStatus === ConnectionStatus.DISCONNECTED &&
        isFirmwareOutOfDate

    const { className, children } = needsFirmwareUpdate
        ? { className: 'bg-yellow', children: 'Update Firmware' }
        : statusStyling[connectionStatus]

    const stateClickHandlers: Partial<Record<ConnectionStatus, () => void>> = {
        // No method means the browser supports neither USB nor Bluetooth.
        ...(communicationMethod
            ? { [ConnectionStatus.DISCONNECTED]: () => connect() }
            : {}),
        [ConnectionStatus.CONNECTED]: async () => {
            try {
                await sendCode()
            } catch {
                // sendCode rejects on a failed verification and has already reported why.
                return
            }
            //TODO: Make this not run every time
            runCode()
        },
        [ConnectionStatus.RUNNING]: () => {
            restart()
        },
    }

    const handleClick = stateClickHandlers[connectionStatus]
    return (
        <Button
            href={needsFirmwareUpdate ? '../flash' : undefined}
            className={twMerge(
                `rounded-3xl box-shadow w-65 text-xl font-bold py-3 px-2 pointer-events-auto ${className}`,
            )}
            onClick={needsFirmwareUpdate ? undefined : handleClick}
            disabled={!needsFirmwareUpdate && !handleClick}
        >
            {children}
        </Button>
    )
}
