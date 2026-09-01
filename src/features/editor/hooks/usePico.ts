import { useEffect, useState, useCallback } from 'react'
import { pico } from '@/libs/communication/communicate'
import type { PaletteColorName } from '@/data/colorPalette'
import type { PicoState, CommunicationMethod } from 'src/types/communication'
import { ConnectionStatus, FirmwareStatus } from 'src/types/communication'
import { getGeneratedCode } from '@/features/editor/state/codeProvider'
export function usePico() {
    const [state, setState] = useState<PicoState>(pico.getState())

    useEffect(() => {
        const handleStateChange = (newState: PicoState) => {
            setState(newState)
        }

        pico.on('stateChange', handleStateChange)

        return () => {
            pico.off('stateChange', handleStateChange)
        }
    }, [])

    const setCommunicationMethod = useCallback(
        async (method: CommunicationMethod) => {
            await pico.setCommunicationMethod(method)
        },
        [],
    )

    const connect = useCallback(() => {
        pico.request()
    }, [])

    const disconnect = useCallback(async () => {
        await pico.disconnect()
    }, [])

    const restart = useCallback(() => {
        pico.restart()
    }, [])

    const colorCalibrate = useCallback((name: PaletteColorName) => {
        pico.colorCalibrate(name)
    }, [])

    const colorResetColor = useCallback((name: PaletteColorName) => {
        pico.colorResetColor(name)
    }, [])

    const sendCode = useCallback(async () => {
        const code = await getGeneratedCode()
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
        communicationMethod: state.communicationMethod,

        // Computed values
        isConnected: state.connectionStatus === ConnectionStatus.CONNECTED,
        isConnecting: state.connectionStatus === ConnectionStatus.CONNECTING,
        isFirmwareUpToDate: state.firmwareStatus === FirmwareStatus.UP_TO_DATE,
        isFirmwareOutOfDate:
            state.firmwareStatus === FirmwareStatus.OUT_OF_DATE,

        // Actions
        setCommunicationMethod,
        connect,
        disconnect,
        restart,
        colorCalibrate,
        colorResetColor,
        sendCode,
        runCode,
        bootloaderMode,
    }
}
