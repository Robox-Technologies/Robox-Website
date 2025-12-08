import { pico } from './communication/communicate';
import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python'

import { printToConsole } from './console';
import * as sanitizeHtml from 'sanitize-html';
import { showToast } from '@root/toast';

const scriptDependency = `
from roboxlib import Motors, LineSensors, UltrasonicSensor, ColorSensor
from machine import Pin, Timer, UART
import time
import json
import sys
ENV_LED = Pin(25, Pin.OUT)
uart = UART(0, baudrate=9600, tx=Pin(0), rx=Pin(1))
line = LineSensors()
left_motor_polarity = right_motor_polarity = -1
ultrasonic = UltrasonicSensor()

def generatePrint(typ, message):
    jsmessage = {"type": typ, "message": message}
    return json.dumps(jsmessage)
try:
    color_sensor = ColorSensor()
except Exception:
    generatePrint("error", "Cannot connect to colour sensor, is it on?")
motors = Motors()
motor_speed = 60
`

let downloadingToPico = false

export function postBlocklyWSInjection() {
    let sameCode = false;

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
        if (connectionManagment.getAttribute("loading") === "true") return
        pico.request()
        connectionManagment.setAttribute("loading",  "true")
    });
    downloadButton?.addEventListener("click", () => {
        if (connectionManagment.getAttribute("loading") === "true") return
        sendCode(ws)
        connectionManagment.setAttribute("loading",  "true")

    })
    downloadConnectionButton?.addEventListener("click", () => {
        if (connectionManagment.getAttribute("loading") === "true") return
        downloadingToPico = true
        connectionManagment.setAttribute("loading",  "true")
        sendCode(ws)
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
        if (!sameCode) await sendCode(ws)
        sameCode = true
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

    ws.addChangeListener((event) => {
        if (event.isUiEvent) return;
        sameCode = false;
    })

}
async function sendCode(ws: Blockly.Workspace) {
    const code = pythonGenerator.workspaceToCode(ws);
    const finalCode = `${scriptDependency}\n${code}\nevent_begin()`
    await pico.sendCode(finalCode)
    printToConsole("Code sent to Ro/Box");
}
export function getPythonCode(ws: Blockly.Workspace): string {
    const code = pythonGenerator.workspaceToCode(ws);
    return `${scriptDependency}\n${code}\nevent_begin()`
}
