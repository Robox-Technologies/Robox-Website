import {
    useState,
    useRef,
    useEffect,
    type Dispatch,
    type SetStateAction,
    type HTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { twMerge } from 'tailwind-merge'
export default function Dialog({
    ref,
    trigger,
    children,
    className,
    ...props
}: {
    ref?: React.RefObject<HTMLDialogElement | null>
    trigger: (setIsOpen: Dispatch<SetStateAction<boolean>>) => React.ReactNode
    children: React.ReactNode
} & HTMLAttributes<HTMLDialogElement>) {
    const [isOpen, setIsOpen] = useState(false)
    if (!ref) {
        ref = useRef<HTMLDialogElement>(null)
    }
    const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
        if (event.target === ref.current) {
            setIsOpen(false)
        }
    }

    useEffect(() => {
        const modal = ref.current
        if (!modal) return

        if (isOpen && !modal.open) {
            modal.showModal()
        } else if (!isOpen && modal.open) {
            modal.close()
        }
    }, [isOpen])
    return (
        <div>
            {trigger(setIsOpen)}

            {isOpen &&
                createPortal(
                    <dialog
                        ref={ref}
                        onClose={() => setIsOpen(false)}
                        onCancel={() => setIsOpen(false)}
                        onClick={handleClick}
                        className={twMerge(
                            'fixed open:flex flex-col top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
                            // A margin at every width: full-bleed puts the rounded corners off-screen.
                            'w-[calc(100%-2rem)] max-w-lg',
                            'rounded-lg shadow-lg bg-white',
                            'open:zoom-in-95 open:duration-200',
                            className,
                        )}
                        {...props}
                    >
                        <button
                            onClick={() => setIsOpen(false)}
                            className="button-interactive absolute top-3.5 right-4 rounded-md flex items-center justify-center py-1 px-1.5"
                        >
                            <FontAwesomeIcon
                                icon={faXmark}
                                className="size-4 text-red-500"
                            />
                            <span className="sr-only">Close</span>
                        </button>
                        {children}
                    </dialog>,
                    document.body,
                )}
        </div>
    )
}
export function DialogHeader({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={twMerge(
                'border-b border-gray-300 flex items-center text-xl flex-col font-semibold px-6 py-3 pr-12 text-black',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export function DialogFooter({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={twMerge(
                'border-t border-gray-300 gap-4 px-6 py-4 flex',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}
export function DialogBody({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={twMerge(
                // `flex-auto`, not `flex-1`: WebKit gives a `flex-basis: 0` child no
                // contribution to a `fit-content` main size, flattening the dialog.
                'relative gap-4 flex-auto overflow-auto',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}
