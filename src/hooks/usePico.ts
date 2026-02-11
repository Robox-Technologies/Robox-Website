import { useEffect, useState, useCallback } from 'react'
import { pico } from '@libs/communication/communicate'
import type { PicoState, CommunicationMethod } from "src/types/communication";
import { ConnectionStatus, FirmwareStatus }  from "src/types/communication";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
const scriptDependency = `
from roboxlib import Motors, LineSensors, UltrasonicSensor, ColorSensor
from machine import Pin, Timer
import time
import json
import sys
ENV_LED = Pin(25, Pin.OUT)
line = LineSensors()
left_motor_polarity = right_motor_polarity = -1
ultrasonic = UltrasonicSensor()

def generatePrint(typ, message):
    jsmessage = {"type": typ, "message": message}
    return json.dumps(jsmessage)
try:
    color_sensor = ColorSensor()
except Exception:
    generatePrint("error", "Cannot connect to colour sensor, is it on?")
motors = Motors()
motor_speed = 60
`
export function usePico() {
    const [state, setState] = useState<PicoState>(pico.getState())


    useEffect(() => {
        const handleStateChange = (newState: PicoState) => {
            setState(newState)
        }

        const handleRevert = () => {
            // Handle user canceling the connection dialog
            console.log('User canceled connection request')
        }

        pico.on('stateChange', handleStateChange)

        pico.on('revert', handleRevert)

        return () => {
            pico.off('stateChange', handleStateChange)

            pico.off('revert', handleRevert)
        }
    }, [])

    const setCommunicationMethod = useCallback(async (method: CommunicationMethod) => {
        await pico.setCommunicationMethod(method)
    }, [])

    const connect = useCallback(() => {
        pico.request()
    }, [])

    const disconnect = useCallback(async () => {
        await pico.disconnect()
    }, [])

    const restart = useCallback(() => {
        pico.restart()
    }, [])

    const colorCalibrate = useCallback(() => {
        pico.colorCalibrate()
    }, [])

    const sendCode = useCallback(async () => {
        const workspace = Blockly.getMainWorkspace()
        const code = pythonGenerator.workspaceToCode(workspace);
        const finalCode = `${scriptDependency}\n${code}\nevent_begin()`
        await pico.sendCode(finalCode)
    }, [])

    const runCode = useCallback(() => {
        pico.runCode()
    }, [])

    const bootloaderMode = useCallback(() => {
        pico.bootloaderMode()
    }, [])


    return {
        // State
        connectionStatus: state.connectionStatus,
        firmwareStatus: state.firmwareStatus,
        firmwareVersion: state.firmwareVersion,
        isRestarting: state.isRestarting,
        communicationMethod: state.communicationMethod,
        
        // Computed values
        isConnected: state.connectionStatus === ConnectionStatus.CONNECTED,
        isConnecting: state.connectionStatus === ConnectionStatus.CONNECTING,
        isFirmwareUpToDate: state.firmwareStatus === FirmwareStatus.UP_TO_DATE,
        isFirmwareOutOfDate: state.firmwareStatus === FirmwareStatus.OUT_OF_DATE,
        
        // Actions
        setCommunicationMethod,
        connect,
        disconnect,
        restart,
        colorCalibrate,
        sendCode,
        runCode,
        bootloaderMode
    }
}
