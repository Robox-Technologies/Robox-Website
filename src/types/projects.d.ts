import type { Dayjs } from 'dayjs'
import type { PinsOf, SensorKey } from './extraSensors'
import type { ExtensionKey } from './extensions'
export type ProjectType = 'block' | 'python'

interface UserProject {
    name: string
    time: Dayjs
    type: ProjectType
    workspace: Record<string, unknown> | null
    code: string | null
    thumbnail: string | null
    extensions: UserExtensions
    sensors: UserSensors
}
export type UserExtensions = Record<ExtensionKey, boolean>

export type UserSensor<T extends SensorKey> = {
    name: string
    type: T
    pins: Record<PinsOf<T>, number>
}

export type UserSensors = Record<
    string,
    { [K in SensorKey]: UserSensor<K> }[SensorKey]
>
