import { getProject, getProjectExtensions } from "@root/blockly/serialization"
import { Extension, Sensor } from "~types/projects"


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
export const ExtensionScripts: Record<Extension, string> = {
    "SERVO": servoScript,
    "EXTRA_SENSORS": "",
}
const sensorScripts: Record<Sensor, (name: string, ...args: number[]) => string> = {
    "ULTRASONIC_SENSOR": createUltrasonicSensorScript,
    "ANALOG_LIGHT_SENSOR": createAnalogSensorScript,
}
function createUltrasonicSensorScript(name: string, triggerPin: number, echoPin: number) {
    return `
    ultrasonic${name} = UltrasonicSensor(trigger_pin=${triggerPin}, echo_pin=${echoPin})
`
}
function createAnalogSensorScript(name: string,pin: number) {
    return `
from machine import ADC
analog${name} = ADC(Pin(${pin}))
`
}
export function getPreambleScript(uuid: string) {
    const userExtensions = getProjectExtensions(uuid)
    let script = mainScript
    if (userExtensions["EXTRA_SENSORS"]) {
        const project = getProject(uuid)
        const extraSensors = project.sensors || []
        for (const sensor of extraSensors) {
            script += sensorScripts[sensor.type](sensor.name, ...Object.values(sensor.pins))
        }
    }
    for (const ext of Object.keys(userExtensions)) {
        if (ext in ExtensionScripts) {
            script += ExtensionScripts[ext]
        }
    }

    return script
}