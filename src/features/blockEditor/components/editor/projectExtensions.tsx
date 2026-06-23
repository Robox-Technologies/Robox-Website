import Button from '@/components/button'

import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece'
import type { Dispatch, SetStateAction } from 'react'
export default function ProjectExtensions({
    setIsOpen,
}: {
    setIsOpen: Dispatch<SetStateAction<boolean>>
}) {
    return (
        <Button
            className="text-white h-4 w-4 p-0! flex justify-center items-center"
            icon={faPuzzlePiece}
            onClick={() => {
                setIsOpen(true)
            }}
        />
    )
}
