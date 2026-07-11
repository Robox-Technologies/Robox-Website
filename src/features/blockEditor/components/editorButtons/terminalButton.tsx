import Button from '@/components/button'
import { faTerminal } from '@fortawesome/free-solid-svg-icons'
import { usePico } from '@/features/blockEditor/hooks/usePico'
import type { Dispatch, SetStateAction } from 'react'
import { ConnectionStatus } from '@/types/communication'

export default function TerminalButton({
    setIsOpen,
}: {
    setIsOpen: Dispatch<SetStateAction<boolean>>
}) {
    const { connectionStatus } = usePico()
    const connected =
        connectionStatus !== ConnectionStatus.DISCONNECTED &&
        connectionStatus !== ConnectionStatus.DISCONNECTING
    return (
        <Button
            icon={faTerminal}
            id="terminalButton"
            className={`flex items-center w-10 h-10 justify-center border-2 rounded-full bg-white box-shadow pointer-events-auto 
                ${connected ? 'border-green' : 'border-gray-500 hover:cursor-not-allowed!'}`}
            iconStyle={`text-xl
                ${connected ? 'text-green' : 'text-gray-500'}
            `}
            disabled={!connected}
            onClick={() => {
                if (!connected) return
                setIsOpen(true)
            }}
        />
    )
}
