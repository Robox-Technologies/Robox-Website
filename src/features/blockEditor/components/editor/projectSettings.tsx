import {
    faGear,
    faEyeDropper,
    faDownload,
    faScrewdriverWrench,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import Button from '@components/button'
import { useEffect, useRef, useState } from 'react'

const Settings = {
    'Calibrate Colour': {
        icon: faEyeDropper,
        color: 'text-blue',
    },
    'Update Firmware': {
        icon: faScrewdriverWrench,
        color: 'text-black',
    },
    'Download Project': {
        icon: faDownload,
        color: 'text-green',
    },
}

export default function ProjectSettings() {
    const dialogRef = useRef<HTMLDialogElement>(null)

    const handleClickOutside = (event: MouseEvent) => {
        if (
            dialogRef.current &&
            dialogRef.current.open &&
            event.target instanceof Element &&
            !event.target.closest('.modal')
        ) {
            dialogRef.current.close()
            setGearRotation((prev) => prev - 45) // Rotate the gear on each click
            dialogRef.current?.classList.remove("open");
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
                    const isOpen = dialogRef.current?.classList.contains("open");
                    
                    if (isOpen) {
                        dialogRef.current?.classList.remove("open");
                        dialogRef.current?.close()
                    } else {
                        dialogRef.current?.classList.add("open");
                        dialogRef.current?.show()
                    }

                    event.stopPropagation() // Prevent the click from propagating to the document
                    setGearRotation((prev) => prev + 45 * (isOpen ? -1 : 1)) // Rotate the gear on each click
                }}
                icon={faGear}
                iconStyle='fa-xl'
                className="text-white h-8 w-8 p-0! flex justify-center items-center transition-transform duration-300 ease-in-out"
                style={{ transform: `rotate(${gearRotation}deg)` }}
            />
            <dialog
                ref={dialogRef}
                className="modal absolute top-1/2 right-full -translate-x-full rounded drop-shadow-xl ml-2 transform border-2 border-black p-0! z-50"
            >
                <div className="modal-content bg-white h-25 w-45 rounded flex flex-col p-2! justify-between">
                    {Object.entries(Settings).map(([name, { icon, color }]) => (
                        <ProjectSettingButton
                            key={name}
                            icon={icon}
                            color={color}
                        >
                            {name}
                        </ProjectSettingButton>
                    ))}
                </div>
            </dialog>
        </div>
    )
}
function ProjectSettingButton({
    color,
    icon,
    children,
}: {
    color: string
    icon: IconProp
    children: React.ReactNode
}) {
    return (
        <Button
            icon={icon}
            iconStyle={color}
            className={`text-black! text-sm p-0! text-left flex items-center gap-2`}
        >
            {children}
        </Button>
    )
}
