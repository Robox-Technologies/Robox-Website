import Button from "@components/button";
import { usePico } from "@hooks/usePico";
import { ConnectionStatus } from "src/types/communication";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect } from "react";
import { twMerge } from "tailwind-merge";
const statusStyling: Record<ConnectionStatus, {className: string, children: React.ReactNode}> = {
    [ConnectionStatus.CONNECTED]: { className: "bg-green", children: "Run Ro/Box" },
    [ConnectionStatus.CONNECTING]: { className: "bg-blue", children: <FontAwesomeIcon icon={faSpinner} spin /> },
    [ConnectionStatus.DISCONNECTED]: { className: "bg-blue", children: "Connect to Ro/Box" },
    [ConnectionStatus.DISCONNECTING]: { className: "bg-blue", children: <FontAwesomeIcon icon={faSpinner} spin /> },
    [ConnectionStatus.RESTARTING]: { className: "bg-red", children: <FontAwesomeIcon icon={faSpinner} spin /> },
    [ConnectionStatus.LOADING]: { className: "bg-red", children: <FontAwesomeIcon icon={faSpinner} spin /> },
    [ConnectionStatus.RUNNING]: { className: "bg-red", children: "Stop Ro/Box" },
}
export default function MainButton() {
    const { connectionStatus, connect, disconnect, restart, sendCode, runCode, setCommunicationMethod } = usePico()
    const { className, children } = statusStyling[connectionStatus]
    useEffect(() => {
        //TODO: make this dynamic based on platform
        setCommunicationMethod("iOSBluetooth")
    }, [])
    const stateClickHandlers: Partial<Record<ConnectionStatus, () => void>> = {
        [ConnectionStatus.DISCONNECTED]: () => {
            connect()
        },
        [ConnectionStatus.CONNECTED]: async () => {
            await sendCode()
            //TODO: Make this not run every time
            runCode()
            // runCode()
        },
        [ConnectionStatus.RUNNING]: () => {
            restart()
        }
    }

    const handleClick = stateClickHandlers[connectionStatus]
    return (
        <Button className={twMerge(`rounded-3xl box-shadow w-65 text-xl font-bold py-3 px-2 pointer-events-auto ${className}`)} onClick={handleClick}  disabled={!handleClick}>
            {children}
        </Button>
    )
}
