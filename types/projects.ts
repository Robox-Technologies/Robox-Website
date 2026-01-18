import dayjs from "dayjs"
import extensions from "../src/pages/editor/extensions.json" with { type: "json" };
import sensors from "../src/pages/editor/sensors.json" with { type: "json" };

const parsedExtensions = typeof extensions == "string" ? JSON.parse(extensions) : extensions;
const parsedSensors = typeof sensors == "string" ? JSON.parse(sensors) : sensors;

export type Extension = Extract<keyof typeof parsedExtensions, string>
export type Sensor = Extract<keyof typeof parsedSensors, string>
function keysOf<T extends object>(obj: T): Extract<keyof T, string>[] {
    return Object.keys(obj) as Extract<keyof T, string>[]
}

export const extensionKeys = keysOf(parsedExtensions)
export const sensorKeys = keysOf(parsedSensors)
export type UserExtensions = {
    [key in Extension]?: boolean
}
type UserSensorPins = {
    [key: string]: number
}
type UserSensor = {
    type: Sensor,
    pins: UserSensorPins
}
export type UserSensors = UserSensor[]
export type Project = {
    name: string
    time: dayjs.Dayjs
    workspace: {[key: string]: unknown} | false
    thumbnail: string
    extensions: UserExtensions
    sensors: UserSensors
}

export type Projects = {[uuid: string]: Project}