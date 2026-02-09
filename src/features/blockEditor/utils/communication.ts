import { BleClient, numbersToDataView, numberToUUID } from '@capacitor-community/bluetooth-le';
const piVendorId = 0x2e8a
const UART_SERVICE = 0xFFE0
const UART_CHARACTERISTIC = 0xFFE1
const CHUNK_SIZE = 20
try {
    await BleClient.initialize();

    const device = await BleClient.requestDevice({
        services: [numberToUUID(UART_SERVICE)],
    });
    await BleClient.connect(device.deviceId, (deviceId) => onDisconnect(deviceId));
    console.log('connected to device', device);
    BleClient.startNotifications(
        device.deviceId,
        numberToUUID(UART_SERVICE),
        numberToUUID(UART_CHARACTERISTIC),
        (value) => {
            const decoder = new TextDecoder();
            console.log('received value', decoder.decode(value));
        },
    );
    const data = new TextEncoder().encode('x01FIRMCHECK\n');
    BleClient.write(device.deviceId, numberToUUID(UART_SERVICE), numberToUUID(UART_CHARACTERISTIC), numbersToDataView(Array.from(data)));


//     // connect to device, the onDisconnect callback is optional
//     await BleClient.connect(device.deviceId, (deviceId) => onDisconnect(deviceId));
//     console.log('connected to device', device);

//     const result = await BleClient.read(device.deviceId, HEART_RATE_SERVICE, BODY_SENSOR_LOCATION_CHARACTERISTIC);
//     console.log('body sensor location', result.getUint8(0));

//     const battery = await BleClient.read(device.deviceId, BATTERY_SERVICE, BATTERY_CHARACTERISTIC);
//     console.log('battery level', battery.getUint8(0));

//     await BleClient.write(device.deviceId, POLAR_PMD_SERVICE, POLAR_PMD_CONTROL_POINT, numbersToDataView([1, 0]));
//     console.log('written [1, 0] to control point');

//     await BleClient.startNotifications(
//       device.deviceId,
//       HEART_RATE_SERVICE,
//       HEART_RATE_MEASUREMENT_CHARACTERISTIC,
//       (value) => {
//         console.log('current heart rate', parseHeartRate(value));
//       },
//     );

//     // disconnect after 10 sec
//     setTimeout(async () => {
//       await BleClient.stopNotifications(device.deviceId, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT_CHARACTERISTIC);
//       await BleClient.disconnect(device.deviceId);
//       console.log('disconnected from device', device);
//     }, 10000);
  } catch (error) {
    console.error(error);
}
function onDisconnect(deviceId: string): void {
    console.log(`device ${deviceId} disconnected`);
}