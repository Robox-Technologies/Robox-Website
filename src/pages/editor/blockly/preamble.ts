import { getProjectExtensions } from "@root/blockly/serialization"
import { ExtensionType } from "~types/projects"


export const mainScript = `
from roboxlib import Motors, LineSensors, UltrasonicSensor, ColorSensor, Servo
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
`
const servoScript = `
servo = Servo()
`
export const ExtensionScripts = {
    [ExtensionType.SERVO]: servoScript,
}
export function getPreambleScript(uuid: string) {
    const userExtensions = getProjectExtensions(uuid)
    let script = mainScript
    for (const ext of Object.keys(userExtensions)) {
        if (ext in ExtensionScripts) {
            script += ExtensionScripts[ext]
        }
    }
    return script
}