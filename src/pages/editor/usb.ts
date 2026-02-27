import { pico } from './communication/communicate';
import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python'

import { printToConsole } from './console';
import * as sanitizeHtml from 'sanitize-html';
import { showToast } from '@root/toast';

const scriptDependency = `
from roboxlib import Motors, LineSensors, UltrasonicSensor, ColorSensor
from machine import Pin, Timer
import time
import json
import sys
ENV_LED = Pin(25, Pin.OUT)
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
_STANDARD_COLORS = {
    "red": (255, 0, 0),
    "orange": (255, 165, 0),
    "yellow": (255, 255, 0),
    "green": (0, 128, 0),
    "blue": (0, 0, 255),
    "purple": (128, 0, 128),
    "black": (0, 0, 0),
    "white": (255, 255, 255)
}
def rgb_to_hsv(r, g, b):
    r, g, b = r / 255.0, g / 255.0, b / 255.0  # Normalize to [0,1]
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    delta = max_c - min_c

    # Hue
    if delta == 0:
        h = 0
    elif max_c == r:
        h = (60 * ((g - b) / delta)) % 360
    elif max_c == g:
        h = (60 * ((b - r) / delta)) + 120
    elif max_c == b:
        h = (60 * ((r - g) / delta)) + 240

    # Saturation
    s = 0 if max_c == 0 else delta / max_c

    # Value
    v = max_c

    return h, s, v  # h in [0,360), s and v in [0,1]
def closest_colour_name():
    r, g, b = color_sensor.readColor()
    h, s, v = rgb_to_hsv(r, g, b)

    # Quick white/black check
    if s < 0.1 and v > 0.9:
        return "white"
    if v < 0.1:
        return "black"

    # Heuristic: if hue is in cyan range and value is low, prefer green
    # Cyan roughly around 180° to 210°
    if 180 <= h <= 210 and v < 0.5:
        return "green"

    def hue_distance(h1, h2):
        d = abs(h1 - h2)
        return min(d, 360 - d) / 180  # normalized 0 to 1

    best_match = None
    best_score = float('inf')

    for name, (r_std, g_std, b_std) in _STANDARD_COLORS.items():
        h_std, s_std, v_std = rgb_to_hsv(r_std, g_std, b_std)
        hd = hue_distance(h, h_std)
        sd = abs(s - s_std)
        vd = abs(v - v_std)

        score = hd * 3 + sd * 1 + vd * 1

        if score < best_score:
            best_score = score
            best_match = name

    return best_match
try:
    color_sensor.closest_colour_name()
except Exception:
    color_sensor.closest_colour_name = closest_colour_name
`

let downloadingToPico = false


export function postBlocklyWSInjection() {
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
    runButton?.addEventListener("click", () => {
        if (connectionManagment.getAttribute("loading") === "true") return
        connectionManagment.setAttribute("status",  "running")
        connectionManagment.setAttribute("loading",  "false")
        sendCode(ws)
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
function sendCode(ws: Blockly.Workspace) {
    const code = pythonGenerator.workspaceToCode(ws);
    const finalCode = `${scriptDependency}\n${code}\nevent_begin()`
    pico.sendCode(finalCode)
    printToConsole("Code sent to Ro/Box");
}
export function getPythonCode(ws: Blockly.Workspace): string {
    const code = pythonGenerator.workspaceToCode(ws);
    return `${scriptDependency}\n${code}\nevent_begin()`
}

