
const piVendorId = 0x2e8a

const COMMANDS = {
    FIRMWARECHECK: "x01FIRMCHECK\r",
    STARTUPLOAD: "x02BEGINUPLD\r",
    ENDUPLOAD: "x03ENDUPLD\r",
    STARTPROGRAM: "x04STARTPROG\r",
    CALIBRATECOLOR: "x05COLORCALIBRATE\r",
    RESTART: "x06RESTART\r",
    BOOTLOADER: "x07BOOTLOADER\r",
    KEYBOARDINTERRUPT: "\x03\n",
}

type picoMessage = {
    type: "console" | "confirmation" | "error",
    message: string,
}

type disconnectOptions = {
    error: boolean, 
    restarting: boolean,
}
type firmwareOptions = {
    firmwareVersion?: string;
}
type picoOptions = {
    message: string
}
type EventPayload = { event: 'calibrated'; options: picoOptions } | 
                    { event: 'console'; options: picoOptions } | 
                    { event: 'downloaded'; options: object } | 
                    { event: 'firmware'; options: firmwareOptions } | 
                    { event: 'confirmation'; options: picoOptions } | 
                    { event: 'error'; options: picoOptions } | 
                    { event: 'connect'; options: object } | 
                    { event: 'disconnect'; options: disconnectOptions } |
                    { event: 'revert'; options: object };
type Methods = "USB" | "Bluetooth"
interface Communication {
    destroyed: boolean;
    request(): void;
    connect(port: SerialPort | BluetoothDevice): Promise<void>;
    disconnect(): Promise<void>;
    destroy(): Promise<void>;
    write(string: string): Promise<void>;
    read(): void;
    initialize(): void;
}

const WRITE_TIMEOUT = 2;
const CURRENT_FIRMWARE_VERSION = "1.0.0";
export class Pico extends EventTarget {
    communication: Communication | null
    firmwareVersion: string
    restarting: boolean
    firmware: boolean
    responded: boolean
    method: Methods | null
    constructor() {
        super()
        this.method = null
        this.communication = null
        this.restarting = false
        this.firmware = false
        this.responded = false
        this.firmwareVersion = "0.0.0";
    }
    emit(payload: EventPayload) {
        this.dispatchEvent(new CustomEvent(payload.event, {detail: payload.options}));
    }
    initialize(): void {
        return this.communication.initialize()
    }
    async disconnect(): Promise<void> {
        try {
            this.responded = false
            this.firmware = false
            await this.communication.disconnect()
            this.emit({ event: 'disconnect', options: { error: false, restarting: this.restarting } })
        }
        catch (e) {
            console.error("Ro/Box Disconnect Error: ", e)
            this.emit({ event: 'error', options: { message: e } })
        }
    }
    read(payload: picoMessage) {
        if (!this.responded) {
            this.responded = true
            this.emit({"event": "connect", "options": {}})
        } 
        const type = payload["type"]
        if (type === "confirmation") {
            this.firmware = true //The firmware check was successful!
        }
        this.emit({"event": type, "options": { message: payload.message }})
    }
    write(command: string): Promise<void> {
        try {
            return this.communication.write(command)
        }
        catch (e) {
            this.emit({ event: 'error', options: { message: e } })
        }
    }
    firmwareCheck() {
        this.write(COMMANDS.FIRMWARECHECK)
        setTimeout(() => {
            this.emit({"event": "firmware", "options": {"firmwareVersion": this.firmwareVersion}})
            if (!this.firmware && this.responded || this.responded && this.firmwareVersion !== CURRENT_FIRMWARE_VERSION) {
                this.emit({"event": "error", "options": {"message": `The firmware running on the Ro/Box (${this.firmwareVersion}) is out of date! Please update it.`}})
            }
            else if (!this.firmware && !this.responded) {
                this.emit({"event": "error", "options": {"message": "Ro/Box did not respond to the firmware check! Please try disconnecting and reconnecting it. If this issue persists, try reflashing the Ro/Box."}})
            }
        }, 1000);
    }
    runCode(): void {
        this.communication.write(COMMANDS.STARTPROGRAM)
    }
    restart(): void {
        this.restarting = true
        this.communication.write(COMMANDS.RESTART)
    }
    bootloaderMode(): void {
        this.communication.write(COMMANDS.BOOTLOADER)
    }
    request() {
        this.communication.request()
    }
    colorCalibrate(): void {
        this.communication.write(COMMANDS.CALIBRATECOLOR)
    }
    async sendCode(code: string): Promise<void> {
        await this.communication.write(COMMANDS.STARTUPLOAD)
        await this.communication.write(code)
        await this.communication.write(COMMANDS.ENDUPLOAD)
        return Promise.resolve()
    }
    async connect(port: SerialPort | BluetoothDevice): Promise<void> {
        try {
            await this.communication.connect(port)
            if (this.restarting) this.restarting = false
            this.firmwareCheck()
        }
        catch (e) {
            this.emit({ event: 'error', options: { message: e } })
        }
    }
    async setCommunicationMethod(method: "USB" | "Bluetooth" | null): Promise<void> {
        if (this.communication) {
            await this.communication.destroy()
        }

        this.method = method
        this.responded = false
        this.firmware = false
        this.restarting = false
        
        if (method === "USB") this.communication = new USBCommunication(this)
        else if (method === "Bluetooth") this.communication = new BluetoothCommunication(this)
        this.initialize()
    }
}
class USBCommunication implements Communication {
    destroyed: boolean = false;

    baudRate: number
    port: SerialPort | null
    textEncoder: TextEncoderStream
    currentWriter: WritableStreamDefaultWriter | null
    textDecoder: TextDecoderStream
    currentReader: ReadableStreamDefaultReader | null
    currentWriterStreamClosed: Promise<void>
    currentReadableStreamClosed: Promise<void>
    constructor(private parent: Pico, baudRate = 9600) {
        this.baudRate = baudRate;
        this.port = null;
        this.textEncoder = new TextEncoderStream();
        this.currentWriter = null;
        this.textDecoder = new TextDecoderStream();
        this.currentReader = null;
        this.currentWriterStreamClosed = Promise.resolve();
        this.currentReadableStreamClosed = Promise.resolve();
    }

    async read(): Promise<void> {
        let error_string = ''
        try {
            while (!this.destroyed) { //Forever loop for reading the pico
                const { value, done } = await this.currentReader.read()
                if (done) {
                    this.currentReader.releaseLock(); //Disconnects the serial port since the port is released
                    break;
                }
                let consoleMessages : picoMessage[] = [] //The console messages SHOULD be sent full JSON, but sometimes that does not happen
                try {
                    if (typeof value !== "string") continue
                    consoleMessages = [JSON.parse(value)] //If the message is broken JSON then this errors and goes to the next step
                    error_string = ''
                } catch {
                    error_string += value
                    const rawErrorMessages = error_string.split("\n")
                    let index = 0
                    errorloop: for (const errorMessage of rawErrorMessages) { //Every JSON object is delimited by a new line, so even if the message is split if you loop over it you can join them together!
                        try {
                            if (typeof errorMessage !== "string") {
                                return Promise.reject("Received non-string message from the Ro/Box!")
                            }
                            consoleMessages.push(JSON.parse(errorMessage))
                            
                        } catch {
                            break errorloop; //Not yet a full JSON message
                        }
                        index += 1
                    }
                    rawErrorMessages.splice(0, index)
                    error_string = rawErrorMessages.join("\n").trim() //Join the rest of the messages together
                }
                for (const message of consoleMessages) {
                    this.parent.read(message)
                }
                consoleMessages = []
            }
        } catch(err) {
            console.warn(err)
        }
    }
    async write(messages: string | string[]): Promise<void> {
        try {
            if (typeof messages === "object") { 
                for (const message of messages) {
                    if (this.destroyed) break;
                    await this.currentWriter.write(`${message}\n`)
                    await new Promise(resolve => setTimeout(resolve, WRITE_TIMEOUT));
                }            
            }
            else {
                if (this.destroyed) return;

                await this.currentWriter.write(`${messages}\n`)
            }
            return Promise.resolve()
        }
        catch {
            return Promise.reject("Could not write to Ro/Box!")
        }
    }
    async connect(port: SerialPort): Promise<void> {
        this.port = port;
        if (this.port?.readable?.locked || this.port?.writable?.locked) {
            console.warn("Port already in use");
            return Promise.reject("Port already in use");
        }
        try {
            await this.port.open({ baudRate: this.baudRate });
        } catch(e) {
            console.error("Error opening port:", e);
            return Promise.reject("We are unable to open the port on the Ro/Box! Try resetting it? This could also be caused by another application using the Ro/Box.");
        }
    
        if (!this.port.writable || !this.port.readable) {
            return Promise.reject("The port is not readable/writable!");
        }
        this.textEncoder = new TextEncoderStream();
        this.textDecoder = new TextDecoderStream();
        this.currentWriterStreamClosed = this.textEncoder.readable.pipeTo(this.port.writable);
        this.currentReadableStreamClosed = this.port.readable.pipeTo(this.textDecoder.writable);
    
        // Only now get writer/reader
        this.currentWriter = this.textEncoder.writable.getWriter();
        this.currentReader = this.textDecoder.readable.getReader();
    
        this.read();
    
        return Promise.resolve();
    }
    async disconnect(): Promise<void> {
        try {
            if (this.currentReader) {
                try {
                    await this.currentReader.cancel();
                    this.currentReader.releaseLock();
                    await this.currentReadableStreamClosed?.catch(() => {});
                } catch {
                    return
                }
            }
        
            if (this.currentWriter) {
                try {
                    await this.currentWriter.close();
                    this.currentWriter.releaseLock();
                    await this.currentWriterStreamClosed?.catch(() => {});
                } catch {
                    return
                }
            }

            if (this.port) {
                try {
                    if (this.port?.readable?.locked || this.port?.writable?.locked) {
                        await this.port.close();
                    } else {
                        await this.port.close();
                    }
                } catch (err) {
                    console.error("Error while closing port:", err);
                    throw new Error("Could not close the port!");
                }
            }

            this.textEncoder = new TextEncoderStream();
            this.textDecoder = new TextDecoderStream();
        }
        catch (e) {
            console.error("Disconnect failed:", e);
            throw new Error(
                e instanceof Error
                    ? e.message
                    : String(e || "Could not disconnect from Ro/Box!")
            );
        }
    }
    async request(): Promise<void> {
        try {
            const port = await navigator.serial.requestPort({
                filters: [{ usbVendorId: piVendorId }]
            });
            await this.parent.connect(port);
        }
        catch(e) {
            if (e instanceof DOMException && e.name === 'NotFoundError') {
                return this.parent.emit({ event: 'revert', options: {} })
            }
            this.parent.emit({ event: 'error', options: { message: 'Could not request Ro/Box! Make sure you have it connected via USB.' } })
        }
    }
    private async initPorts(event: Event): Promise<void> {
        if (!event.target) return
        if ('getInfo' in event.target) {
            const port = event.target as SerialPort;
            const portInfo = port.getInfo()
            if (portInfo.usbVendorId === piVendorId) {
                if (event.type === 'connect') {
                    await this.parent.connect(port)
                }
                else if (event.type === 'disconnect') {
                    await this.parent.disconnect()
                }
            }
        } 
    }
    initialize(): void {
        navigator.serial.addEventListener('connect', this.initPorts);
        navigator.serial.addEventListener('disconnect', this.initPorts);
        // Commenting this for now since I think it would be annoying for users if they have 2 roboxes connected
        // This is an edge case but this also can break some user flow
        // navigator.serial.getPorts().then(ports => {
        //     for (const port of ports) {
        //         const portInfo = port.getInfo()
        //         if (portInfo.usbVendorId === piVendorId) {
        //             this.parent.connect(port)
        //             break;
        //         }
        //     }
        // });
    }
    async destroy(): Promise<void> {
        //These are first since disconnect (restarting) may emit events we don't want after destroy
        navigator.serial.removeEventListener('connect', this.initPorts);
        navigator.serial.removeEventListener('disconnect', this.initPorts);
        await this.disconnect();
        this.destroyed = true;
        this.port = null;
        this.currentReader = null;
        this.currentWriter = null;
    }
}
const UART_SERVICE = 0xFFE0
const UART_CHARACTERISTIC = 0xFFE1
const CHUNK_SIZE = 20

class BluetoothCommunication implements Communication {
    destroyed: boolean = false;

    device: BluetoothDevice | null
    server: BluetoothRemoteGATTServer | null
    characteristic: BluetoothRemoteGATTCharacteristic | null
    decoder: TextDecoder
    encoder: TextEncoder
    buffer: string
    constructor(private parent: Pico) {
        this.device = null
        this.server = null
        this.buffer = ""
        this.characteristic = null
        this.decoder = new TextDecoder()
        this.encoder = new TextEncoder()
    }
    async request(): Promise<void> {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'RoBox' }],
                optionalServices: [UART_SERVICE],
            });
            if (!device) {
                return this.parent.emit({ event: 'error', options: { message: 'Could not request Ro/Box! Make sure you have it powered on and nearby.' } })
            }
            await this.parent.connect(device);
        }
        catch (e) {
            if (e instanceof DOMException && e.name === 'NotFoundError') {
                return this.parent.emit({ event: 'revert', options: {} })
            }
            this.parent.emit({ event: 'error', options: { message: e } })
        }
    }
    async connect(device: BluetoothDevice): Promise<void> {
        this.device = device
        this.server = await device.gatt?.connect() || null
        const service = await this.server?.getPrimaryService(UART_SERVICE) || null
        this.characteristic = await service?.getCharacteristic(UART_CHARACTERISTIC) || null
        await this.characteristic?.startNotifications()
        if (!this.server || !this.characteristic) {
            return this.parent.emit({ event: 'error', options: { message: 'Could not connect to Ro/Box! Try resetting it?' } })
        }
        // The event only exists while connected (so cannot go in initialize)
        this.device.addEventListener('gattserverdisconnected', () => console.log("Disconnected"));
        this.device.addEventListener('gattserverdisconnected', this.initPortsBound);

        this.read();

        return Promise.resolve()
    }
    private readonly valueChangedBound = this.valueChanged.bind(this);
    private valueChanged(event: Event): void {
        if (this.destroyed) return;
        if (event.type !== "characteristicvaluechanged") return;

        const target = event.target 
        if (!target || !("value" in target) || typeof target.value === "undefined") return;

        const rawValue = target.value;
        if (!rawValue || !(rawValue instanceof DataView)) return;

        const value = this.decoder.decode(rawValue); // decode BLE bytes
        if (typeof value !== "string") return;

        // Append the new chunk to the buffer
        this.buffer += value;

        const consoleMessages: picoMessage[] = [];
        const jsonRegex = /\{[^}]*\}/g; // simple JSON object matcher
        let match: RegExpExecArray | null;
        let lastIndex = 0;

        // Extract all complete JSON objects
        while ((match = jsonRegex.exec(this.buffer)) !== null) {
            try {
                const jsonString = match[0];
                const message: picoMessage = JSON.parse(jsonString);
                consoleMessages.push(message);
                lastIndex = jsonRegex.lastIndex;
            } catch {
                // Incomplete or invalid JSON — keep it in buffer
                break;
            }
        }

        // Remove consumed part of buffer
        this.buffer = this.buffer.slice(lastIndex);

        // Send messages to parent
        for (const message of consoleMessages) {
            this.parent.read(message);
        }
    }
    async read(): Promise<void> {
        this.characteristic?.addEventListener('characteristicvaluechanged', this.valueChangedBound);
    }
    private async chunkedWrite(message: string): Promise<void> {
        message += '\n' //Add newline at the end
        for (let i = 0; i < message.length; i += CHUNK_SIZE) {
            const chunk = message.slice(i, i + CHUNK_SIZE);
            const data = this.encoder.encode(`${chunk}`);
            await this.characteristic?.writeValue(data);
            await new Promise(resolve => setTimeout(resolve, WRITE_TIMEOUT));
        }
        return Promise.resolve()
        //Write the newline character at the end
    }
    async write(messages: string | string[]): Promise<void> {
        try {
            if (typeof messages === "object") { 
                for (const message of messages) {
                    if (this.destroyed) break;
                    await this.chunkedWrite(message);
                }                
            }
            else {
                if (this.destroyed) return;
                await this.chunkedWrite(messages);
            }
            return Promise.resolve()
        }
        catch (e) {
            console.error("Write failed:", e);
            this.parent.emit({ event: 'error', options: { message: e } })
            return Promise.reject("Could not write to Ro/Box!")
        }
    }

    initialize(): void {
        return;
    }
    private readonly initPortsBound = this.initPorts.bind(this);
    private initPorts(event: Event): void {
        if (!event.target) return
        const device = event.target as BluetoothDevice;
        if (device.name && device.name.startsWith("RoBox")) {
            if (event.type === 'gattserverdisconnected') {
                this.parent.disconnect()
            }
        }
    }
    async disconnect(): Promise<void> {
        try {
            this.device?.removeEventListener('gattserverdisconnected', this.initPortsBound);
            if (this.server && this.server.connected && this.characteristic) {
                await this.characteristic.stopNotifications();
                this.characteristic.removeEventListener('characteristicvaluechanged', this.valueChangedBound);
            }
            if (this.server && this.server.connected) {
                this.server.disconnect();
            }
            this.device = null;
            this.server = null;
            this.characteristic = null;
        }
        catch (e) {
            console.error("Disconnect failed:", e);
            throw new Error(
                e instanceof Error
                    ? e.message
                    : String(e || "Could not disconnect from Ro/Box!")
            );
        }
    }
    async destroy(): Promise<void> {
        this.device?.removeEventListener('gattserverdisconnected', this.initPortsBound);
        await this.disconnect();
        this.destroyed = true;
    }
}
const pico = new Pico()
export { pico }
