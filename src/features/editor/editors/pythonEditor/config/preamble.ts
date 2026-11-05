import type { ExtensionKey } from 'src/types/extensions'
import type { PinsOf, SensorKey } from 'src/types/extraSensors'
import {
    ExtensionsPreamble,
    ExtraSensorsPreamble,
} from '@/features/editor/config/preamble'
import type {
    UserExtensions,
    UserSensor,
    UserSensors,
} from 'src/types/projects'

export const pythonPreamble = `
from roboxlib import Motors, LineSensors, UltrasonicSensor, ColorSensor

line = LineSensors()
ultrasonic = UltrasonicSensor()
color_sensor = ColorSensor()
motors = Motors()
`.trimStart()

export function buildPythonPreamble(
    project: { extensions?: UserExtensions; sensors?: UserSensors } | null,
): string {
    return (
        pythonPreamble +
        generateExtensionsPreamble(project?.extensions ?? {}) +
        generateExtraSensorsPreamble(project?.sensors ?? {})
    )
}

function generateExtensionsPreamble(
    userExtensions: Partial<UserExtensions>,
): string {
    return Object.entries(userExtensions)
        .filter(([, enabled]) => enabled)
        .map(([key]) => ExtensionsPreamble[key as ExtensionKey])
        .join('\n')
}

function generateExtraSensorsPreamble(userSensors: UserSensors): string {
    return Object.values(userSensors)
        .map((sensor) => callSensorPreamble(sensor))
        .join('\n')
}

function callSensorPreamble<K extends SensorKey>(
    sensor: UserSensor<K>,
): string {
    return ExtraSensorsPreamble[sensor.type](sensor.pins)
}
