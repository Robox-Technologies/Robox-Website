import {DayJS} from 'dayjs';
import { Workspace } from "blockly"
import type { PinsOf, SensorKey } from './extraSensors';
import type { ExtensionKey } from './extensions';
interface UserProject {
    name: string;
    time: DayJS;
    workspace: Workspace | null;
    thumbnail: string | null;
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