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
            className="text-white h-8 w-8 p-0! flex justify-center items-center"
            icon={faPuzzlePiece}
            iconStyle='fa-xl'
            onClick={() => {
                setIsOpen(true)
            }}
        />
    )
}
