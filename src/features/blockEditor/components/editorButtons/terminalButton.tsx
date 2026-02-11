
import Button from "@components/button";
import { faTerminal } from "@fortawesome/free-solid-svg-icons";
import { usePico } from "@hooks/usePico";
import { useStore } from "@nanostores/react";
import { openModal } from "@stores/modals";
export default function TerminalButton() {
    const { isConnected } = usePico()

    return (
        <Button icon={faTerminal} id="terminalButton" 
            className={`flex items-center w-10 h-10 justify-center border-2 rounded-full bg-white box-shadow 
                ${isConnected ? "border-green" : "border-gray-500"}`
            } 
            iconStyle={`text-xl
                ${isConnected ? "text-green" : "text-gray-500"}
            `}
            onClick={
                () => {
                    openModal.set("terminalDialog")
                }
            }
        />
    )
}
