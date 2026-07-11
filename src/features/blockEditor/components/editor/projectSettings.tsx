import {
    faGear,
    faEyeDropper,
    faDownload,
    faScrewdriverWrench,
} from '@fortawesome/free-solid-svg-icons'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import Button from '@/components/button'
import { useEffect, useRef, useState } from 'react'

export default function ProjectSettings() {
    const settingsDialogRef = useRef<HTMLDialogElement>(null)

    const handleClickOutside = (event: MouseEvent) => {
        if (
            settingsDialogRef.current &&
            settingsDialogRef.current.open &&
            event.target instanceof Element &&
            !event.target.closest('.modal')
        ) {
            settingsDialogRef.current.close();
            settingsDialogRef.current?.classList.remove("open");
            setGearRotation((prev) => prev - 45);
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
                    const isOpen = settingsDialogRef.current?.classList.contains("open");
                    
                    if (isOpen) {
                        settingsDialogRef.current?.classList.remove("open");
                        settingsDialogRef.current?.close()
                    } else {
                        settingsDialogRef.current?.classList.add("open");
                        settingsDialogRef.current?.show()
                    }
                    
                    event.stopPropagation() // Prevent the click from propagating to the document
                    setGearRotation((prev) => prev + 45 * (isOpen ? -1 : 1)); // Rotate the gear on each click
                }}
                icon={faGear}
                iconStyle='fa-xl'
                className="text-white h-8 w-8 p-0! flex justify-center items-center transition-transform duration-300 ease-in-out"
                style={{ transform: `rotate(${gearRotation}deg)` }}
            />
            <dialog
                ref={settingsDialogRef}
                className="modal absolute top-1/2 right-full -translate-x-full rounded-lg drop-shadow-xl ml-2 transform border-2 border-black p-0! z-50"
            >
                <div className="modal-content bg-white min-h-25 w-50 rounded flex flex-col p-4! gap-4">
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
            className={`text-black! text-md p-0! text-left flex items-center gap-2`}
            onClick={onClick}
        >
            {children}
        </Button>
    )
}
