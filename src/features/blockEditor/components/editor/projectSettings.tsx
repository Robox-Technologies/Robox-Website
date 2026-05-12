import {
    faGear,
    faEyeDropper,
    faDownload,
    faScrewdriverWrench,
    faLink,
} from '@fortawesome/free-solid-svg-icons'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import Button from '@components/button'
import { useEffect, useRef, useState } from 'react'
import CommunicationMethodDialog from './communicationMethodDialog'

export default function ProjectSettings() {
    const settingsDialogRef = useRef<HTMLDialogElement>(null)

    const handleClickOutside = (event: MouseEvent) => {
        if (
            settingsDialogRef.current &&
            settingsDialogRef.current.open &&
            event.target instanceof Element &&
            !event.target.closest('.modal')
        ) {
            settingsDialogRef.current.close()
            setGearRotation((prev) => prev + 45) // Rotate the gear by 90 degrees on each click
        }
    }

    const [gearRotation, setGearRotation] = useState(0)
    useEffect(() => {
        document.addEventListener('click', handleClickOutside)
        return () => {
            document.removeEventListener('click', handleClickOutside)
        }
    }, [])
    return (
        <div className="project-settings relative">
            <Button
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    settingsDialogRef.current?.show()
                    event.stopPropagation() // Prevent the click from propagating to the document
                    setGearRotation((prev) => prev + 45) // Rotate the gear by 90 degrees on each click
                }}
                icon={faGear}
                className="text-white h-4 w-4 p-0! flex justify-center items-center transition-transform duration-300 ease-in-out"
                style={{ transform: `rotate(${gearRotation}deg)` }}
            />
            <dialog
                ref={settingsDialogRef}
                className="modal absolute top-1/2 right-full -translate-x-full rounded drop-shadow-xl ml-2 transform border-2 border-black p-0! z-50"
            >
                <div className="modal-content bg-white min-h-25 w-45 rounded flex flex-col p-2! gap-1">
                    <ProjectSettingButton icon={faEyeDropper} color="text-blue">
                        Calibrate Colour
                    </ProjectSettingButton>
                    <ProjectSettingButton
                        icon={faScrewdriverWrench}
                        color="text-black"
                    >
                        Update Firmware
                    </ProjectSettingButton>
                    <ProjectSettingButton icon={faDownload} color="text-green">
                        Download Project
                    </ProjectSettingButton>
                    <CommunicationMethodDialog
                        trigger={(open) => (
                            <ProjectSettingButton
                                icon={faLink}
                                color="text-black"
                                onClick={(
                                    event: React.MouseEvent<HTMLButtonElement>,
                                ) => {
                                    event.stopPropagation()
                                    open()
                                }}
                            >
                                Connection Type
                            </ProjectSettingButton>
                        )}
                    />
                </div>
            </dialog>
        </div>
    )
}
function ProjectSettingButton({
    color,
    icon,
    children,
    onClick,
}: {
    color: string
    icon: IconProp
    children: React.ReactNode
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
    return (
        <Button
            icon={icon}
            iconStyle={color}
            className={`text-black! text-sm p-0! text-left flex items-center gap-2`}
            onClick={onClick}
        >
            {children}
        </Button>
    )
}
