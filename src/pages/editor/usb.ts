import { pico } from './communication/communicate';
import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python'

import { printToConsole } from './console';
import * as sanitizeHtml from 'sanitize-html';
import { showToast } from '@root/toast';
import { getPreambleScript } from './blockly/preamble';
import { getProjectExtensions } from '@root/blockly/serialization';
import { ExtensionType } from '~types/projects';
import { ExtensionScripts } from './blockly/preamble';


let downloadingToPico = false


export function postBlocklyWSInjection(uuid: string) {
    const ws = Blockly.getMainWorkspace()
    const connectionManagment = document.getElementById("connection-management")
    const terminalButton = document.getElementById("console-button");
    const connectButton = document.getElementById("connect-robox-button")
    const downloadButton = document.getElementById("download-robox-button")
    const downloadConnectionButton = document.getElementById("download")
    const stopButton = document.getElementById("stop-robox-button")
    const runButton = document.getElementById("run-robox-button")


    if (!connectionManagment) return
    if (!terminalButton) return    

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
        printToConsole(picoEvent.detail.message)
    })
    pico.addEventListener("error", () => {
        connectionManagment.setAttribute("loading",  "false")
    })
    connectButton?.addEventListener("click", () => {
        if (connectionManagment.getAttribute("loading") === "true") return
        pico.request()
        connectionManagment.setAttribute("loading",  "true")
    });
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
    runButton?.addEventListener("click", () => {
        if (connectionManagment.getAttribute("loading") === "true") return
        connectionManagment.setAttribute("status",  "running")
        connectionManagment.setAttribute("loading",  "false")
        sendCode(ws, uuid)
        pico.runCode()
        printToConsole("Code running on Ro/Box");

    })
    
    const stage2Modal = document.querySelector("dialog#bootsel-flash") as HTMLDialogElement | null;
    const stage1Modal = document.querySelector("dialog#bootsel-boot") as HTMLDialogElement | null;
    pico.addEventListener("error", (event) => {
        if (stage2Modal?.hasAttribute("open") || stage1Modal?.hasAttribute("open")) return; // Don't show error if flashing

        const picoEvent = event as CustomEvent
        console.error("Pico Error: ", event)
        showToast("error", "Pico Error", `An error occurred while communicating with the Pico. Please check your connection and try again. \nError: ${sanitizeHtml(picoEvent.detail.message)}`, 5000);
    })
    pico.startupConnect()

}
function sendCode(ws: Blockly.Workspace, uuid: string) {
    const code = pythonGenerator.workspaceToCode(ws);
    const preamble = getPreambleScript(uuid);
    const finalCode = `${preamble}\n${code}\nevent_begin()`
    pico.sendCode(finalCode)
    printToConsole("Code sent to Ro/Box");
}

