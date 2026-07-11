import { useEffect, useRef, useState } from 'react'
import { DialogHeader, DialogBody, DialogFooter } from '@/components/dialog'
import Dialog from '@/components/dialog'
import { faTerminal } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Button from '@/components/button'
import { pico } from '@/libs/communication/communicate'
import TerminalButton from './editorButtons/terminalButton'
export default function TerminalDialog() {
    const [logs, setLogs] = useState<string[]>([])
    const [isAtBottom, setIsAtBottom] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    // Auto scroll when logs update
    useEffect(() => {
        const el = containerRef.current
        if (!el || !isAtBottom) return
        el.scrollTop = el.scrollHeight
    }, [logs, isAtBottom])

    useEffect(() => {
        const handleNewLog = ({ message }: { message: string }) => {
            setLogs((prev) => [...prev, generateLog(message)])
        }

        pico.on('console', handleNewLog)
        return () => {
            pico.off('console', handleNewLog)
        }
    }, [])

    return (
        <Dialog
            id="terminalDialog"
            className="h-150"
            trigger={(setIsOpen) => <TerminalButton setIsOpen={setIsOpen} />}
        >
            <DialogHeader>
                <div className="flex items-center text-xl font-bold">
                    <FontAwesomeIcon
                        icon={faTerminal}
                        className="text-green mr-2 mb-0.5"
                    />
                    <h2>Terminal Output</h2>
                </div>
            </DialogHeader>

            <DialogBody>
                <div
                    ref={containerRef}
                    onScroll={(event) => {
                        const threshold = 5
                        const el = event.currentTarget
                        const atBottom =
                            el.scrollHeight - el.scrollTop <=
                            el.clientHeight + threshold
                        setIsAtBottom(atBottom)
                    }}
                    className="relative font-mono text-sm overflow-y-scroll px-6 py-4 h-full"
                >
                    {logs.map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                </div>
            </DialogBody>

            <DialogFooter>
                <Button
                    onClick={() => {
                        setLogs([])
                    }}
                    className="bg-gray-500 px-4 py-2 text-white rounded-xl hover:bg-gray-600 ml-auto transition-colors"
                >
                    Clear Terminal
                </Button>
            </DialogFooter>
        </Dialog>
    )
}
function generateLog(message: string) {
    const timestamp = new Date().toLocaleTimeString()
    return `[${timestamp}] ${message}`
}