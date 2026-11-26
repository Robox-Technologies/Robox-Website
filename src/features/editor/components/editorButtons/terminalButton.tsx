import Button from '@/components/button'
import { faTerminal } from '@fortawesome/free-solid-svg-icons'
import { usePico } from '@/features/editor/hooks/usePico'
import type { Dispatch, SetStateAction } from 'react'
import { ConnectionStatus } from '@/types/communication'

export default function TerminalButton({
    setIsOpen,
}: {
    setIsOpen: Dispatch<SetStateAction<boolean>>
}) {
    const { connectionStatus } = usePico()
    const connected =
        connectionStatus !== ConnectionStatus.CONNECTING &&
        connectionStatus !== ConnectionStatus.DISCONNECTED &&
        connectionStatus !== ConnectionStatus.DISCONNECTING
    if (!connected) return null
    return (
        <Button
            icon={faTerminal}
            id="terminalButton"
            title="Open terminal output"
            aria-label="Open terminal output"
            className="flex items-center w-10 h-10 justify-center border-2 border-green rounded-full bg-white box-shadow pointer-events-auto"
            iconStyle="text-xl text-green"
            onClick={() => setIsOpen(true)}
        />
    )
}
