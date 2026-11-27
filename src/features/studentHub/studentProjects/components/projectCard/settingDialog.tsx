import Button from '@/components/button'
import { faPencil, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useStore } from '@nanostores/react'
import { openProject, editingProject } from '../../stores/projectSettingsModal'

export default function SettingDialog() {
    const $openProject = useStore(openProject)

    const onClick = (event: React.MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
    }

    const handleEdit = (event: React.MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        editingProject.set($openProject)
    }

    // Opens `deleteProjectDialog.astro`, rendered beside this island in `studentProjects.astro`.
    const handleDelete = (event: React.MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        const dialog = document.querySelector<HTMLDialogElement>(
            '#deleteProjectDialog',
        )
        if (!dialog || !$openProject) return
        dialog.dataset.projectId = $openProject
        dialog.showModal()
    }

    return (
        <dialog
            id="project-settings-dialog"
            className="modal card-control w-32 bg-white rounded-lg drop-shadow-lg border-2 border-black absolute top-45 left-54 flex flex-col z-100"
            onClick={onClick}
        >
            <Button
                onClick={handleEdit}
                className="text-black! p-1.5! flex items-center justify-start gap-1.5 rounded-none"
            >
                <FontAwesomeIcon className="text-blue" icon={faPencil} /> Edit
            </Button>
            <Button
                onClick={handleDelete}
                className="text-black! p-1.5! flex items-center justify-start gap-1.5 rounded-none w-full"
            >
                <FontAwesomeIcon className="text-red" icon={faTrash} /> Delete
            </Button>
        </dialog>
    )
}
