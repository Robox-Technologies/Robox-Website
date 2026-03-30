import { id } from "@features/blockEditor/stores/editor";
import type { ExtensionKey } from "src/types/extensions";
import type { PinsOf, SensorKey } from "src/types/extraSensors";
import type { UserExtensions, UserSensor, UserSensors } from "src/types/projects";

import type { Workspace } from "blockly";
import { pythonGenerator } from "blockly/python";
import { getProject } from "@utils/serialization";
export const preamble = `
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
`
export const ExtensionsPreamble: Record<ExtensionKey, string> = {
    "SERVO": `
    `,
}
export const ExtraSensorsPreamble: {
    [K in SensorKey]: (pins: Record<PinsOf<K>, number>) => string
} = {
    "ANALOG_LIGHT_SENSOR": (pins) => {
        return `
from machine import ADC
light_sensor = ADC(Pin(${pins.signal}))
light_sensor.atten(ADC.ATTN_11DB)
`
    },
    "ULTRASONIC_SENSOR": (pins) => {
        return `
ultrasonic = UltrasonicSensor(trigger_pin=${pins.trigger}, echo_pin=${pins.echo})`
    },
}
