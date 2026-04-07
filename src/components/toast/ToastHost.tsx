import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    faCircleCheck,
    faCircleInfo,
    faCircleXmark,
    faTriangleExclamation,
    faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { twMerge } from 'tailwind-merge'
import { toast, type Toast, type ToastVariant } from '@libs/ui/toast'

const VARIANT_STYLES: Record<
    ToastVariant,
    { icon: typeof faCircleInfo; classes: string; title: string }
> = {
    danger: {
        icon: faCircleXmark,
        classes: 'border-red bg-red/15',
        title: 'Error',
    },
    warning: {
        icon: faTriangleExclamation,
        classes: 'border-yellow bg-yellow/20',
        title: 'Warning',
    },
    informative: {
        icon: faCircleInfo,
        classes: 'border-blue bg-blue/15',
        title: 'Info',
    },
    success: {
        icon: faCircleCheck,
        classes: 'border-green bg-green/20',
        title: 'Success',
    },
}

export default function ToastHost(props: ToastHostProps) {
    const [toasts, setToasts] = useState<Toast[]>(toast.getToasts())
    const timeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
        new Map(),
    )

    useEffect(() => {
        const handleChange = (nextToasts: Toast[]) => {
            setToasts(nextToasts)
        }

        toast.on('change', handleChange)

        return () => {
            toast.off('change', handleChange)
            timeoutMapRef.current.forEach((timeout) => clearTimeout(timeout))
            timeoutMapRef.current.clear()
        }
    }, [])

    useEffect(() => {
        const activeIds = new Set(toasts.map((toastItem) => toastItem.id))

        timeoutMapRef.current.forEach((timeout, id) => {
            if (!activeIds.has(id)) {
                clearTimeout(timeout)
                timeoutMapRef.current.delete(id)
            }
        })

        toasts.forEach((toastItem) => {
            if (timeoutMapRef.current.has(toastItem.id)) {
                return
            }

            const timeout = setTimeout(() => {
                toast.dismiss(toastItem.id)
            }, toastItem.durationMs)

            timeoutMapRef.current.set(toastItem.id, timeout)
        })
    }, [toasts])

    const liveRegionText = useMemo(() => {
        if (toasts.length === 0) {
            return ''
        }

        return toasts[0].title
            ? `${toasts[0].title}: ${toasts[0].message}`
            : toasts[0].message
    }, [toasts])

    return (
        <>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {liveRegionText}
            </div>

            {createPortal(
                <ToastViewport {...props}>
                    {toasts.map((toastItem) => (
                        <ToastItemCard
                            key={toastItem.id}
                            toastItem={toastItem}
                            onDismiss={() => toast.dismiss(toastItem.id)}
                        />
                    ))}
                </ToastViewport>,
                document.body,
            )}
        </>
    )
}

type ToastHostProps = {
    bottomOffsetPx?: number
    rightOffsetPx?: number
    gapPx?: number
    width?: string
}

function ToastViewport({
    children,
    bottomOffsetPx = 94,
    rightOffsetPx = 16,
    gapPx = 10,
    width = 'min(92vw, 24rem)',
}: React.PropsWithChildren<ToastHostProps>) {
    return (
        <div className="pointer-events-none fixed inset-0 z-2147483647">
            <div
                className={twMerge(
                    'fixed pointer-events-none flex',
                    'flex-col-reverse items-end',
                )}
                style={{
                    bottom: `${bottomOffsetPx}px`,
                    right: `${rightOffsetPx}px`,
                    gap: `${gapPx}px`,
                    width,
                }}
            >
                {children}
            </div>
        </div>
    )
}

function ToastItemCard({
    toastItem,
    onDismiss,
}: {
    toastItem: Toast
    onDismiss: () => void
}) {
    const variantConfig = VARIANT_STYLES[toastItem.variant]

    return (
        <div
            className={twMerge(
                'pointer-events-auto m-0 border-2 rounded-xl shadow-lg box-shadow',
                'w-full p-0 overflow-hidden animate-toast-in',
                variantConfig.classes,
            )}
        >
            <div className="flex items-start gap-3 p-4 pr-2 bg-white/85">
                <FontAwesomeIcon
                    icon={variantConfig.icon}
                    className="mt-0.5 text-xl text-black"
                />

                <div className="min-w-0 flex-1">
                    <p className="font-bold text-black leading-tight">
                        {toastItem.title ?? variantConfig.title}
                    </p>
                    <p className="text-sm text-black leading-snug mt-1">
                        {toastItem.message}
                    </p>
                </div>

                {toastItem.dismissible ? (
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss notification"
                        className="rounded-md p-1 border border-black hover:cursor-pointer"
                    >
                        <FontAwesomeIcon
                            icon={faXmark}
                            className="text-base text-black"
                        />
                    </button>
                ) : null}
            </div>
        </div>
    )
}
