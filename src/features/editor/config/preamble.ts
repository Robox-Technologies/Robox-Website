import type { ExtensionKey } from 'src/types/extensions'
import type { PinsOf, SensorKey } from 'src/types/extraSensors'
import extensions from '@/data/extensions.json'
export const preamble = `
from roboxlib import Motors, LineSensors, UltrasonicSensor, ColorSensor
from machine import Pin, Timer
import time
import random
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
motor_speed = 80
`
// Each extension's `preamble` in extensions.json is a list of Python lines.
const extensionPreambles: Record<
    ExtensionKey,
    { name: string; preamble?: string[] }
> = extensions
export const ExtensionsPreamble: Partial<Record<ExtensionKey, string>> =
    Object.fromEntries(
        Object.entries(extensionPreambles).flatMap(([key, { preamble }]) =>
            preamble ? [[key, `\n${preamble.join('\n')}\n`]] : [],
        ),
    )
export const ExtraSensorsPreamble: {
    [K in SensorKey]: (pins: Record<PinsOf<K>, number>) => string
} = {
    ANALOG_LIGHT_SENSOR: (pins) => {
        return `
from machine import ADC
light_sensor = ADC(Pin(${pins.signal}))
light_sensor.atten(ADC.ATTN_11DB)
`
    },
    ULTRASONIC_SENSOR: (pins) => {
        return `
ultrasonic = UltrasonicSensor(trigger_pin=${pins.trigger}, echo_pin=${pins.echo})`
    },
}
