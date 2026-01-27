import sensors from '@data/sensors.json';
const sensorsConfig = sensors as const;

export type SensorKey = keyof typeof sensorsConfig;
export type PinsOf<S extends SensorKey> = keyof typeof sensorsConfig[S]['pins'];

declare module "@data/sensors.json" {
    export interface Sensor {
        name: string;
        pins: Record<PinsOf<SensorKey>, SensorPin>;
    }
    export interface SensorPin {
        name: string;
        available_pins: number[];
        shared: boolean;
    }
    const sensors: Record<SensorKey, Sensor>;
    export default sensors;
}