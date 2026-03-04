
import Button from "@components/button";
import { faTerminal } from "@fortawesome/free-solid-svg-icons";
import { usePico } from "@hooks/usePico";
import type { Dispatch, SetStateAction } from "react";

export default function TerminalButton({setIsOpen}: {setIsOpen: Dispatch<SetStateAction<boolean>>}) {
    const { isConnected } = usePico()

    return (
        <Button icon={faTerminal} id="terminalButton" 
            className={`flex items-center w-10 h-10 justify-center border-2 rounded-full bg-white box-shadow pointer-events-auto 
                ${isConnected ? "border-green" : "border-gray-500 hover:cursor-not-allowed!"}`
            } 
            iconStyle={`text-xl
                ${isConnected ? "text-green" : "text-gray-500"}
            `}
            disabled={!isConnected}
            onClick={
                () => {
                    if (!isConnected) return;
                    setIsOpen(true);
                }
            }
        />
    )
}
