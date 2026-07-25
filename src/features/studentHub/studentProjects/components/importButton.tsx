import Button from '@/components/button'
import { faDownload, faUpload } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'
import { importProjectFile } from '@/utils/serialization'
import { reloadProjects } from '../stores/projectsStore'
import { toast } from '@/libs/ui/toast'

export default function ImportButton() {
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)

    const importFile = async (file: File | undefined) => {
        if (!file) return
        const id = await importProjectFile(file)
        if (!id) {
            toast.danger({
                message: `${file.name} isn’t a Ro/Box project file.`,
            })
            return
        }
        await reloadProjects()
        toast.success({ message: 'Project imported.' })
    }

    // Dropping anywhere on the page works, as in the original — the overlay is
    // just the affordance.
    useEffect(() => {
        const onDragEnter = (event: DragEvent) => {
            event.preventDefault()
            if (event.dataTransfer?.types?.includes('Files')) setDragging(true)
        }
        const onDragOver = (event: DragEvent) => event.preventDefault()
        // relatedTarget is null only when the pointer leaves the window.
        const onDragLeave = (event: DragEvent) => {
            event.preventDefault()
            if (event.relatedTarget === null) setDragging(false)
        }
        const onDrop = (event: DragEvent) => {
            event.preventDefault()
            setDragging(false)
            void importFile(event.dataTransfer?.files?.[0])
        }

        document.addEventListener('dragenter', onDragEnter)
        document.addEventListener('dragover', onDragOver)
        document.addEventListener('dragleave', onDragLeave)
        document.addEventListener('drop', onDrop)
        return () => {
            document.removeEventListener('dragenter', onDragEnter)
            document.removeEventListener('dragover', onDragOver)
            document.removeEventListener('dragleave', onDragLeave)
            document.removeEventListener('drop', onDrop)
        }
    }, [])

    return (
        <>
            <Button
                className="bg-white text-black! hover:bg-[#eee] text-lg flex flex-row items-center gap-2 px-4 py-2 rounded-full drop-shadow-sm hover:cursor-pointer"
                onClick={() => inputRef.current?.click()}
            >
                <FontAwesomeIcon className="w-5 h-5" icon={faDownload} />
                Import
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept=".robox,application/json"
                className="hidden"
                onChange={(event) => {
                    void importFile(event.currentTarget.files?.[0])
                    // Allow re-importing the same file.
                    event.currentTarget.value = ''
                }}
            />
            {dragging && (
                /* Scrim, icon and heading sized as the original's #dropzone:
                   true black at 70% (not the theme's slate `black`), 48px icon,
                   24px heading. */
                <div className="fixed inset-0 z-200 flex flex-col items-center justify-center gap-4 bg-[rgba(0,0,0,0.7)] text-center text-primary">
                    <FontAwesomeIcon icon={faUpload} className="h-12 w-12" />
                    <h2 className="text-2xl font-bold text-primary">
                        Drop your .robox file to import!
                    </h2>
                </div>
            )}
        </>
    )
}
