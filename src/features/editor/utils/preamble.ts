import type { ExtensionKey } from 'src/types/extensions'
import type { SensorKey } from 'src/types/extraSensors'
import type { UserExtensions, UserSensor, UserSensors } from 'src/types/projects'
import { preamble, ExtensionsPreamble, ExtraSensorsPreamble } from '../config/preamble'

// Shared between the block editor and the raw python editor, so a project's
// robot API setup (roboxlib imports, sensor/motor singletons, configured
// extensions/sensors) stays identical regardless of which editor produced it.
export function buildPreamble(
    project: { extensions?: UserExtensions; sensors?: UserSensors } | null,
): string {
    return (
        preamble +
        generateExtensionsPreamble(project?.extensions ?? ({} as UserExtensions)) +
        generateExtraSensorsPreamble(project?.sensors ?? {})
    )
}

function generateExtensionsPreamble(userExtensions: UserExtensions): string {
    return Object.values(userExtensions)
        .filter((ext) => ext === true)
        .map((_, index) => {
            const extKey = Object.keys(userExtensions)[index] as ExtensionKey
            return ExtensionsPreamble[extKey]
        })
        .join('\n')
}

function generateExtraSensorsPreamble(userExtraSensors: UserSensors): string {
    return Object.values(userExtraSensors)
        .map((sensor) => callSensorPreamble(sensor))
        .join('\n')
}

// So we preserve the typing of the sensor keys in the preamble generation
function callSensorPreamble<K extends SensorKey>(
    sensor: UserSensor<K>,
): string {
    return ExtraSensorsPreamble[sensor.type](sensor.pins)
}
