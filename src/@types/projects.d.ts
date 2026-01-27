import {DayJS} from 'dayjs';
import { Workspace } from "blockly"
import type { PinsOf } from './extraSensors';
import type { SensorKey } from './extraSensors';
interface UserProject {
    name: string;
    time: DayJS;
    workspace: Workspace;
    thumbnail: string;
    extensions: UserExtensions;
    sensors: UserSensors;
}
export type UserExtensions = Record<ExtensionKey, boolean>;
export type UserSensorPins = Record<string, number>;
export type UserSensor<T extends SensorKey = SensorKey> = {
    name: string,
    type: T,
    pins: Record<PinsOf<T>, number>,
}
export type UserSensors = Record<string, UserSensor>;