import Button from '@/components/button'
import { faPencil } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import DeleteDialog from '../deleteDialog'
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

    return (
        <dialog
            id="project-settings-dialog"
            className="modal w-32 bg-white rounded-lg drop-shadow-lg border-2 border-black absolute top-45 left-54 flex flex-col z-100"
            onClick={onClick}
        >
            <Button
                onClick={handleEdit}
                className="text-black! p-1.5! flex items-center justify-start gap-1.5 hover:cursor-pointer"
            >
                <FontAwesomeIcon className="text-blue" icon={faPencil} /> Edit
            </Button>
            <DeleteDialog />
        </dialog>
    )
}
