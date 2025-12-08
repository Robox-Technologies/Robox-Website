
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
    upToDate: boolean;
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
                    { event: 'disconnect'; options: disconnectOptions }
interface Communication {
    request(): void;
    connect(port: SerialPort | BluetoothDevice): Promise<void>;
    disconnect(): Promise<void>;
    write(string: string): Promise<void>;
    read(): void;
    initialize(): void;
}

const WRITE_TIMEOUT = 5;
export class Pico extends EventTarget {
    communication: Communication
    firmwareVersion: number
    restarting: boolean
    firmware: boolean
    responded: boolean
    constructor(method: "USB" | "Bluetooth", firmwareVersion=1) {
        super()
        if (method === "USB") this.communication = new USBCommunication(this)
        else this.communication = new BluetoothCommunication(this)
        this.restarting = false
        this.firmware = false
        this.responded = false
        this.firmwareVersion = firmwareVersion
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
            console.error("Pico Disconnect Error: ", e)
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
            this.emit({"event": "firmware", "options": {upToDate: this.firmware}})
            if (!this.firmware && this.responded) {
                this.emit({"event": "error", "options": {"message": "The firmware on the Pico is out of date! Please update it."}})
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
}
class USBCommunication implements Communication {
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
            while (true) { //Forever loop for reading the pico
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
                                return Promise.reject("Received non-string message from pico!")
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
                    await this.currentWriter.write(`${message}\n`)
                    await new Promise(resolve => setTimeout(resolve, WRITE_TIMEOUT));
                }                
            }
            else {
                await this.currentWriter.write(`${messages}\n`)
            }
            return Promise.resolve()
        }
        catch {
            return Promise.reject("Could not write to pico!")
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
        } catch {
            return Promise.reject("We are unable to open the port on the pico! Try resetting it?");
        }
    
        if (!this.port.writable || !this.port.readable) {
            return Promise.reject("The port is not readable/writable!");
        }
        this.textEncoder = new TextEncoderStream();
        this.textDecoder = new TextDecoderStream();
        // Pipe them AFTER creation
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
            this.currentWriter = this.textEncoder.writable.getWriter();
            this.currentReader = this.textDecoder.readable.getReader();
        }
        catch (e) {
            console.error("Disconnect failed:", e);
            throw new Error(
                e instanceof Error
                    ? e.message
                    : String(e || "Could not disconnect from pico!")
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
        catch {
            this.parent.emit({ event: 'error', options: { message: 'Could not request pico! Make sure you have it connected via USB.' } })
        }
    }
    initialize(): void {
        navigator.serial.addEventListener('connect', async (event) => {
            if (!event.target) return
            if ('getInfo' in event.target) {
                const port = event.target as SerialPort;
                const portInfo = port.getInfo()
                if (portInfo.usbVendorId === piVendorId) {
                    await this.parent.connect(port)
                }
            } 
        });
        navigator.serial.addEventListener('disconnect', async (event) => {
            if (!event.target) return
            if ('getInfo' in event.target) {
                const port = event.target as SerialPort;
                const portInfo = port.getInfo()
                if (portInfo.usbVendorId === piVendorId) {
                    await this.parent.disconnect()
                }
            }
        });
        navigator.serial.getPorts().then(ports => {
            for (const port of ports) {
                const portInfo = port.getInfo()
                if (portInfo.usbVendorId === piVendorId) {
                    this.parent.connect(port)
                    break;
                }
            }
        });
    }
}
const UART_SERVICE = 0xFFE0
const UART_CHARACTERISTIC = 0xFFE1
const CHUNK_SIZE = 20
class BluetoothCommunication implements Communication {
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
        this.read();
        return Promise.resolve()
    }
    private valueChanged(event: Event): void {
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
        this.characteristic?.addEventListener('characteristicvaluechanged', this.valueChanged.bind(this));
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
                    await this.chunkedWrite(message);
                }                
            }
            else {
                await this.chunkedWrite(messages);
            }
            return Promise.resolve()
        }
        catch (e) {
            console.error("Write failed:", e);
            this.parent.emit({ event: 'error', options: { message: e } })
            return Promise.reject("Could not write to pico!")
        }
    }
    initialize(): void {
        return;
    }
    async disconnect(): Promise<void> {
        try {
            if (this.characteristic) {
                await this.characteristic.stopNotifications();
                this.characteristic.removeEventListener('characteristicvaluechanged', this.valueChanged);
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
                    : String(e || "Could not disconnect from pico!")
            );
        }
    }
}
const pico = new Pico("Bluetooth")
pico.initialize();
export { pico }
