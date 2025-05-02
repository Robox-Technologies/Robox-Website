
const piVendorId = 0x2e8a

const COMMANDS = {
    FIRMWARECHECK: "x019FIRMCHECK\r",
    STARTUPLOAD: "x032BEGINUPLD\r",
    ENDUPLOAD: "x04\r",
    STARTPROGRAM: "x021STARTPROG\r",
    KEYBOARDINTERRUPT: "\x03\n"
}

type picoMessage = {
    type: "console" | "confirmation" | "error",
    message: string,
}

type disconnectOptions = {
    error: boolean, 
    restarting: boolean,
}
type connectOptions = {
    
}
type firmwareOptions = {
    upToDate: boolean;
}
type picoOptions = {
    message: string
}
type EventPayload = { event: 'console'; options: picoOptions } | { event: 'downloaded'; options: {} } | { event: 'firmware'; options: firmwareOptions } | { event: 'confirmation'; options: picoOptions } | { event: 'error'; options: picoOptions } | { event: 'connect'; options: connectOptions } | { event: 'disconnect'; options: disconnectOptions }

class Pico extends EventTarget {
    communication: USBCommunication
    firmwareVersion: number
    restarting: boolean
    firmware: boolean
    constructor(method: "USB" | "Bluetooth", firmwareVersion=1) {
        super()
        if (method === "USB") this.communication = new USBCommunication(this)
        this.restarting = false
        this.firmware = false
        this.firmwareVersion = 1
    }
    init() {
        navigator.serial.addEventListener("connect", (event) => { //When pico is connected 
            if (!event.target) return
            if ('getInfo' in event.target) {
                const port = event.target as SerialPort;
                let portInfo = port.getInfo()
                if (portInfo.usbVendorId === piVendorId) {
                    //Could be a future issue
                    // pico.connect(port || event.port)
                    this.connect(port)
                }
            }
        });
        
        navigator.serial.addEventListener("disconnect", async (event) => { //When pico is disconnected 
            if (!event.target) return
            if ('getInfo' in event.target) {
                const port = event.target as SerialPort;
                let portInfo = port.getInfo()
                if (portInfo.usbVendorId === piVendorId) {
                    await this.disconnect()
                }
            }
        });
    }
    async disconnect() {
        
        let disconnected = await this.communication.disconnect()
        if (disconnected) this.emit({event: "disconnect", options: {error: false, restarting: this.restarting}})
    }
    emit(payload: EventPayload) {
        this.dispatchEvent(new CustomEvent(payload.event, {detail: payload.options}));
    }
    read(payload: picoMessage) {
        let type = payload["type"]
        if (type === "confirmation") {
            this.firmware = true //The firmware check was successful!
        }
        this.emit({event: type, options: payload})
    }
    write(command: string) {
        this.communication.write(command) 
    }
    firmwareCheck() {
        this.write(COMMANDS.FIRMWARECHECK)
        setTimeout(() => {
            this.emit({"event": "firmware", "options": {upToDate: this.firmware}})

        }, 1000);
    }
    restart() {
        this.restarting = true
        this.communication.write([
            COMMANDS.KEYBOARDINTERRUPT, 
            "import machine\r",
            "machine.reset()\r"
        ])
    }
    request() {
        this.communication.request()
    }
    sendCode(code: string) {
        this.communication.write([
            `${COMMANDS.STARTUPLOAD}${code}\r${COMMANDS.ENDUPLOAD}`
        ])
    }
    runCode() {
        this.communication.write([
            `${COMMANDS.STARTPROGRAM}`
        ])
    }
    async connect(port: any) {
        let connected = await this.communication.connect(port)
        if (connected) {
            this.emit({event: "connect", options: {}})
            if (this.restarting) this.restarting = false
            this.firmwareCheck()
        }
    }
    startupConnect() { //Check if the Pico is already connected to the website on startup
        navigator.serial.getPorts().then(ports => {
            for (const port of ports) {
                let portInfo = port.getInfo()
                if (portInfo.usbVendorId === piVendorId) {
                    this.connect(port)
                    break;
                }
            }
        });
    }

}
class USBCommunication {
    baudRate: number
    port: SerialPort 
    textEncoder: TextEncoderStream
    currentWriter: WritableStreamDefaultWriter
    textDecoder: TextDecoderStream
    currentReader: ReadableStreamDefaultReader
    currentWriterStreamClosed: Promise<void> 
    currentReadableStreamClosed: Promise<void>
    constructor(private parent: Pico, baudRate = 9600) {
        this.baudRate = baudRate;
    }
    
    async read() {
        let error_string = ''
        try {
            usbloop: while (true) { //Forever loop for reading the pico
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
                }
                catch (err) {
                    error_string += value
                    let rawErrorMessages = error_string.split("\n")
                    let index = 0
                    errorloop: for (const errorMessage of rawErrorMessages) { //Every JSON object is delimited by a new line, so even if the message is split if you loop over it you can join them together!
                        try {
                            if (typeof errorMessage !== "string") {
                                throw new Error("Invalid input: expected a JSON string");
                            }
                            consoleMessages.push(JSON.parse(errorMessage))
                            
                        }
                        catch (err) {
                            break errorloop; //Not yet a full JSON message
                        }
                        index += 1
                    }
                    rawErrorMessages.splice(0, index)
                    error_string = rawErrorMessages.join("\n") 
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
    async write(messages: string | string[]) {
        try {
            if (typeof messages === "object") { //Check if its an array object
                for (const message of messages) {
                    await this.currentWriter.write(message)
                    await new Promise(resolve => setTimeout(resolve, 10));
                }                
            }
            else {
                await this.currentWriter.write(messages)
            }
        }
        catch(err) {
            this.parent.emit({"event": "error", options: { "message": "Could not write to pico!"}})
        }
    }
    async connect(port: SerialPort) {
        this.port = port;
        if (this.port?.readable?.locked || this.port?.writable?.locked) {
            console.warn("Port already in use");
            return false;
        }
        try {
            await this.port.open({ baudRate: this.baudRate });
        } catch (err) {
            this.parent.emit({ event: "error", options: { message: "We are unable to open the port on the pico! Try resetting it?" } });
            return false;
        }
    
        if (!this.port.writable || !this.port.readable) {
            this.parent.emit({ event: "error", options: { message: "The port is not readable/writable!" } });
            return false;
        }
    
        // Create streams
        this.textEncoder = new TextEncoderStream();
        this.textDecoder = new TextDecoderStream();
    
        // Pipe them AFTER creation
        this.currentWriterStreamClosed = this.textEncoder.readable.pipeTo(this.port.writable);
        this.currentReadableStreamClosed = this.port.readable.pipeTo(this.textDecoder.writable);
    
        // Only now get writer/reader
        this.currentWriter = this.textEncoder.writable.getWriter();
        this.currentReader = this.textDecoder.readable.getReader();
    
        this.read();
    
        return true;
    }
    async disconnect() {
        if (this.currentReader) {
            try {
                await this.currentReader.cancel();
                this.currentReader.releaseLock();
                await this.currentReadableStreamClosed?.catch(() => {});
            } catch (err) {
                this.parent.emit({
                    event: "error",
                    options: { message: "Could not close Pico reader" }
                });
            }
        }
    
        if (this.currentWriter) {
            try {
                await this.currentWriter.close();
                this.currentWriter.releaseLock();
                await this.currentWriterStreamClosed?.catch(() => {});
            } catch (err) {
                this.parent.emit({
                    event: "error",
                    options: { message: "Could not close Pico writer" }
                });
            }
        }
    
        if (this.port?.readable?.locked || this.port?.writable?.locked) {
            try {
                await this.port.close();
            } catch (err) {
                this.parent.emit({
                    event: "error",
                    options: { message: "Could not close Pico port" }
                });
            }
        }
    
        // Reinitialize for next connection
        this.textEncoder = new TextEncoderStream();
        this.textDecoder = new TextDecoderStream();
        this.currentWriter = this.textEncoder.writable.getWriter();
        this.currentReader = this.textDecoder.readable.getReader();
    
        return true;
    }
    async request() {
        const device = navigator.serial.requestPort({ filters: [{ usbVendorId: piVendorId }] });
        device.then(async (port) => {
            this.parent.connect(port)
        })
        .catch((error) => { //User did not select a port (or error connecting) show toolbar?
            if (error.name === "NotFoundError") return
            this.parent.emit({event: "error", options: {message: "Could not connect to the pico! Try resetting it?"}})
            console.warn("Could not connect to the port")
            return
        })
    }
}
export let pico = new Pico("USB")
pico.init()