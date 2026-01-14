import { pico } from './communication/communicate';
import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python'

import { printToConsole } from './console';
import * as sanitizeHtml from 'sanitize-html';
import { showToast } from '@root/toast';
import { getPreambleScript } from './blockly/preamble';

let downloadingToPico = false

export function postBlocklyWSInjection(uuid: string) {
    let sameCode = false;
    const ws = Blockly.getMainWorkspace()
    const connectionManagment = document.getElementById("connection-management")
    const terminalButton = document.getElementById("console-button");
    const connectButton = document.getElementById("connect-robox-button")
    const downloadButton = document.getElementById("download-robox-button")
    const downloadConnectionButton = document.getElementById("download")
    const stopButton = document.getElementById("stop-robox-button")
    const runButton = document.getElementById("run-robox-button")

    const connectWithUSBButton = document.getElementById("connect-robox-usb")
    const connectWithBluetoothButton = document.getElementById("connect-robox-bluetooth")

    const connectModal: HTMLDialogElement | null = document.querySelector("dialog#connect-robox-modal")
    if (!connectionManagment || !connectModal || !terminalButton) return
    pico.addEventListener("revert", () => {
        connectionManagment.setAttribute("loading",  "false")
    })
    pico.addEventListener("disconnect", (event) => {
        const picoEvent = event as CustomEvent
        if (!picoEvent.detail.restarting) { //Disconnected
            connectionManagment.setAttribute("status",  "disconnected")
            connectionManagment.setAttribute("loading",  "false")
            terminalButton.setAttribute("disabled", "");
        }
    })
    pico.addEventListener("connect", () => {
        connectionManagment.setAttribute("status",  "downloaded")
        connectionManagment.setAttribute("loading",  "false")
        terminalButton.removeAttribute("disabled")
    })
    pico.addEventListener("download", () => {
        connectionManagment.setAttribute("loading",  "false")

        if (downloadingToPico) {
            connectionManagment.setAttribute("status",  "downloaded")
        }
    })
    pico.addEventListener("console", (event) => {
        const picoEvent = event as CustomEvent
        if (sameCode && picoEvent.detail.message.trim() === "Starting the program") {
            connectionManagment.setAttribute("status",  "running")
            connectionManagment.setAttribute("loading",  "false")
        }
        printToConsole(picoEvent.detail.message)
    })
    pico.addEventListener("error", () => {
        connectionManagment.setAttribute("loading",  "false")
    })

    connectButton?.addEventListener("click", () => {
        // Show the two buttons to connect to Ro/Box (USB or Bluetooth)
        connectModal.showModal()
    });
    connectWithUSBButton?.addEventListener("click", async () => {
        connectModal.close()
        if (connectionManagment.getAttribute("loading") === "true") return
        connectionManagment.setAttribute("loading",  "true")
        await pico.setCommunicationMethod("USB")
        pico.request()
    })
    connectWithBluetoothButton?.addEventListener("click", async () => {
        connectModal.close()
        if (connectionManagment.getAttribute("loading") === "true") return
        connectionManagment.setAttribute("loading",  "true")
        await pico.setCommunicationMethod("Bluetooth")
        pico.request()
    })


    downloadButton?.addEventListener("click", () => {
        if (connectionManagment.getAttribute("loading") === "true") return
        sendCode(ws, uuid)
        connectionManagment.setAttribute("loading",  "true")

    })
    downloadConnectionButton?.addEventListener("click", () => {
        if (connectionManagment.getAttribute("loading") === "true") return
        downloadingToPico = true
        connectionManagment.setAttribute("loading",  "true")
        sendCode(ws, uuid)
    })
    stopButton?.addEventListener("click", () => {
        if (connectionManagment.getAttribute("loading") === "true") return
        pico.restart()
        connectionManagment.setAttribute("loading",  "true")
    })
    runButton?.addEventListener("click", async () => {
        if (connectionManagment.getAttribute("loading") === "true") return
        connectionManagment.setAttribute("status",  "running")
        connectionManagment.setAttribute("loading",  "true")
        if (!sameCode) await sendCode(ws, uuid)
        sameCode = true
        pico.runCode()
        printToConsole("Code running on Ro/Box");
    })
    
    const stage2Modal = document.querySelector("dialog#bootsel-flash") as HTMLDialogElement | null;
    const stage1Modal = document.querySelector("dialog#bootsel-boot") as HTMLDialogElement | null;
    pico.addEventListener("error", (event) => {
        if (stage2Modal?.hasAttribute("open") || stage1Modal?.hasAttribute("open")) return; // Don't show error if flashing

        const picoEvent = event as CustomEvent
        console.error("Ro/Box Error: ", event)
        showToast("error", "Ro/Box Error", `An error occurred while communicating with the Ro/Box. Please check your connection and try again. \nError: ${sanitizeHtml(picoEvent.detail.message)}`, 5000);
    })

    ws.addChangeListener((event) => {
        if (event.isUiEvent) return;
        sameCode = false;
    })

}
async function sendCode(ws: Blockly.Workspace, uuid: string) {
    const finalCode = getPythonCode(ws, uuid);
    await pico.sendCode(finalCode)
    printToConsole("Code sent to Ro/Box");
}
export function getPythonCode(ws: Blockly.Workspace, uuid: string): string {
    
    const code = pythonGenerator.workspaceToCode(ws);
    const preamble = getPreambleScript(uuid);
    const finalCode = `${preamble}\n${code}\nevent_begin()`
    return finalCode
}