import { id } from "@stores/editor";
import type { ExtensionKey } from "src/types/extensions";
import type { PinsOf, SensorKey } from "src/types/extraSensors";
import type { UserExtensions, UserSensor, UserSensors } from "src/types/projects";

import type { Workspace } from "blockly";
import { pythonGenerator } from "blockly/python";
import { getProject } from "@utils/serialization";
const preamble = `
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
const ExtensionsPreamble: Record<ExtensionKey, string> = {
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
export function generateCode(workspace: Workspace) {
    const $projectId = id.get();
    if (!$projectId) throw new Error("No project ID found");
    const project = getProject($projectId);
    if (!project) throw new Error("Project not found");
    const extensionsPreamble = generateExtensionsPreamble(project.extensions);
    const extraSensorsPreamble = generateExtraSensorsPreamble(project.sensors);

    const code = preamble + extensionsPreamble + extraSensorsPreamble + pythonGenerator.workspaceToCode(workspace);
    return code;
}
function generateExtensionsPreamble(userExtensions: UserExtensions): string {
    return Object.values(userExtensions)
        .filter(ext => ext === true)
        .map((ext, index) => {
            const extKey = Object.keys(userExtensions)[index] as ExtensionKey;
            return ExtensionsPreamble[extKey];
        })
        .join("\n");
}
function generateExtraSensorsPreamble(userExtraSensors: UserSensors): string {
    return Object.values(userExtraSensors)
        .map(sensor => callSensorPreamble(sensor))
        .join("\n");
}
// So we preserver the typing of the sensor keys in the preamble generation
function callSensorPreamble<K extends SensorKey>(sensor: UserSensor<K>): string {
    return ExtraSensorsPreamble[sensor.type](sensor.pins);
}