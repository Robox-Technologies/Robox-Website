import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '@/components/button'
import { faCheck, faX } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function ProjectEditInput({
    initialName,
    onSave,
    onCancel,
}: {
    initialName: string
    onSave: (name: string) => void
    onCancel: () => void
}) {
    const [inputValue, setInputValue] = useState(initialName)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
    }, [])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
        setError(null)
    }, [])

    const handleSave = useCallback(() => {
        const trimmedName = inputValue.trim()

        if (!trimmedName) {
            setError('Project name cannot be empty')
            return
        }

        if (trimmedName.length > 100) {
            setError('Project name must be 100 characters or less')
            return
        }

        onSave(trimmedName)
    }, [inputValue, onSave])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                handleSave()
            } else if (e.key === 'Escape') {
                e.preventDefault()
                onCancel()
            }
        },
        [handleSave, onCancel]
    )

    const handleBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            const nextFocusedElement = e.relatedTarget as HTMLElement | null
            if (nextFocusedElement?.closest('button')) {
                return
            }
            onCancel()
        },
        [onCancel]
    )

    return (
        <div className="card-control flex gap-1 w-full items-center">
            <div className="flex-1 relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-full border border-blue px-2 py-1 rounded text-black text-lg font-bold"
                    placeholder="Enter project name"
                    onClick={(e) => e.stopPropagation()}
                />
                {error && (
                    <div className="absolute top-full left-0 bg-red-100 text-red-700 text-xs p-1 rounded mt-1 whitespace-nowrap z-10">
                        {error}
                    </div>
                )}
            </div>
            <Button
                // Prevent the button from stealing focus on press: in WebKit
                // (Safari / the iOS WKWebView) a mouse/touch press on a button
                // doesn't focus it, so the input would blur with a null
                // relatedTarget and handleBlur would cancel the edit before
                // this onClick (save) could fire.
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSave()
                }}
                className="p-1! h-8 w-8 flex items-center justify-center bg-green"
            >
                <FontAwesomeIcon icon={faCheck} className="text-white h-4 w-4" />
            </Button>
            <Button
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onCancel()
                }}
                className="p-1! h-8 w-8 flex items-center justify-center bg-red"
            >
                <FontAwesomeIcon icon={faX} className="text-white h-4 w-4" />
            </Button>
        </div>
    )
}
