import Button from '@components/button'
import Dialog, { DialogBody, DialogFooter, DialogHeader } from '@components/dialog'
import { usePico } from '@features/blockEditor/hooks/usePico'
import { useRef, type Dispatch, type SetStateAction } from 'react'
import type { CommunicationMethod } from 'src/types/communication'

const COMMUNICATION_PREFERENCE_KEY = 'robox.communicationMethod'
type SelectableCommunicationMethod = Exclude<CommunicationMethod, null>

const CommunicationMethods: {
    label: string
    method: SelectableCommunicationMethod
}[] = [
    {
        label: 'Bluetooth',
        method: 'WebBluetooth',
    },
    {
        label: 'USB',
        method: 'USB',
    },
]

export default function CommunicationMethodDialog({
    trigger,
}: {
    trigger: (open: () => void) => React.ReactNode
}) {
    const { communicationMethod, setCommunicationMethod } = usePico()
    const setIsOpenRef = useRef<Dispatch<SetStateAction<boolean>> | null>(null)

    const closeDialog = () => {
        setIsOpenRef.current?.(false)
    }

    const handleSetCommunicationMethod = async (
        method: SelectableCommunicationMethod,
    ) => {
        await setCommunicationMethod(method)
        if (typeof window !== 'undefined') {
            localStorage.setItem(COMMUNICATION_PREFERENCE_KEY, method)
        }
        closeDialog()
    }

    return (
        <Dialog
            id="communicationMethodDialog"
            className="max-w-md"
            trigger={(setIsOpen) => {
                setIsOpenRef.current = setIsOpen
                return trigger(() => setIsOpen(true))
            }}
        >
            <DialogHeader className="items-start text-base">
                Choose Connection
            </DialogHeader>
            <DialogBody className="px-6 py-4">
                <p className="text-sm text-black mb-3">
                    Bluetooth is used by default unless you pick USB.
                </p>
                <div className="flex flex-col gap-2">
                    {CommunicationMethods.map(({ label, method }) => {
                        const isSelected = communicationMethod === method
                        return (
                            <Button
                                key={method}
                                className={`w-full text-left text-sm border border-black/20 px-3! py-2! rounded ${
                                    isSelected
                                        ? 'bg-blue text-white'
                                        : 'bg-white text-black!'
                                }`}
                                onClick={() => {
                                    void handleSetCommunicationMethod(method)
                                }}
                            >
                                {label}
                            </Button>
                        )
                    })}
                </div>
            </DialogBody>
            <DialogFooter className="justify-end">
                <Button
                    className="text-black! bg-gray-200 px-3! py-2! text-sm"
                    onClick={closeDialog}
                >
                    Cancel
                </Button>
            </DialogFooter>
        </Dialog>
    )
}