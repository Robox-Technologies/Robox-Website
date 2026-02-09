import { useEffect, useState, useCallback } from 'react'
import { pico } from '@libs/communication/communicate'
import type { PicoState, CommunicationMethod } from 'communication'
import { ConnectionStatus, FirmwareStatus } from 'communication'

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

    const sendCode = useCallback(async (code: string) => {
        await pico.sendCode(code)
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
        lastError: state.lastError,
        lastMessage: state.lastMessage,
        communicationMethod: state.communicationMethod,
        
        // Computed values
        isConnected: state.connectionStatus === ConnectionStatus.CONNECTED,
        isConnecting: state.connectionStatus === ConnectionStatus.CONNECTING,
        hasError: state.connectionStatus === ConnectionStatus.ERROR || state.lastError !== null,
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
