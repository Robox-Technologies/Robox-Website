export function printToConsole(message: string) {
    const consoleOutput = document.querySelector("#console .modal-content") as HTMLDivElement | null;
    if (consoleOutput) {
        consoleOutput.appendChild(generatePrintElement(message));
        const atBottom = Math.abs(consoleOutput.scrollHeight - consoleOutput.scrollTop - consoleOutput.clientHeight) < 1;
        if (atBottom) {
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    }
}
function generatePrintElement(message: string): HTMLPreElement {
    const printElement = document.createElement("pre");
    const time = new Date().toLocaleTimeString();
    printElement.innerText = `[${time}] ${message}`;
    printElement.className = "console-output-line";
    return printElement;
}
export function clearConsole() {
    const consoleOutput = document.querySelector("#console .modal-content") as HTMLDivElement | null;
    if (consoleOutput) {
        consoleOutput.innerHTML = "";
    }
}