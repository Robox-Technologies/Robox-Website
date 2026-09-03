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
        connect,
        restart,
        sendCode,
        runCode,
    } = usePico()
    const { className, children } = statusStyling[connectionStatus]
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
            className={twMerge(
                `rounded-3xl box-shadow w-65 text-xl font-bold py-3 px-2 pointer-events-auto ${className}`,
            )}
            onClick={handleClick}
            disabled={!handleClick}
        >
            {children}
        </Button>
    )
}
