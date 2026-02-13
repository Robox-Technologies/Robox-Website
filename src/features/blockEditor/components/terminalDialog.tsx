import { useEffect, useRef, useState } from "react";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@components/dialog";
import { faTerminal } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "@components/button";
import { pico } from "@libs/communication/communicate";
export default function TerminalDialog() {
    const [logs, setLogs] = useState<string[]>([]);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto scroll when logs update
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isAtBottom) return;
        el.scrollTop = el.scrollHeight;
    }, [logs, isAtBottom]);

    // Track manual scrolling
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleScroll = () => {
            const threshold = 5;
            const atBottom =
                el.scrollHeight - el.scrollTop <= el.clientHeight + threshold;
            setIsAtBottom(atBottom);
        };
        const handleNewLog = ({message}: {message: string}) => {
            setLogs((prev) => [...prev, message]);
        }
        el.addEventListener("scroll", handleScroll);
        pico.on("console", handleNewLog);
        return () => {
            el.removeEventListener("scroll", handleScroll);
            pico.off("console", handleNewLog);
        };
    }, []);

    return (
        <Dialog id="terminalDialog" className="h-150">
            <DialogHeader>
                <div className="flex items-center text-xl font-bold">
                    <FontAwesomeIcon icon={faTerminal} className="text-green mr-2 mb-0.5" />
                    <h2>Terminal Output</h2>
                </div>
            </DialogHeader>

            <DialogBody>
                <div
                    ref={containerRef}
                    className="relative font-mono text-sm overflow-y-scroll px-6 h-full"
                >
                    {logs.map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                </div>
            </DialogBody>

            <DialogFooter>
                <Button
                    onClick={() => {
                        console.log("Clearing terminal output");
                        setLogs([]);
                    }}
                    className="bg-gray-500 px-4 py-2 text-white rounded-xl hover:bg-gray-600 ml-auto transition-colors"
                >
                    Clear Terminal
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
