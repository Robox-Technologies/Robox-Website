import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useStore } from '@nanostores/react'
import { openProject } from '../../stores/projectSettingsModal'
import Button from '@/components/button'

export default function ProjectSettings({ id }: { id: string }) {
    const $selectedProject = useStore(openProject)
    const handleClick = (event: React.MouseEvent) => {
        if ($selectedProject === id) {
            openProject.set(null)
        } else {
            openProject.set(id)
        }
        event.preventDefault()
        event.stopPropagation()
    }
    return (
        <Button
            onClick={handleClick}
            className="project-settings ml-auto shrink-0 pr-0 -transform-y-1 bg-transparent text-black! w-8 h-8 flex items-center justify-center p-0 rounded-full!"
        >
            <FontAwesomeIcon
                className="w-5 h-5 text-black"
                icon={faEllipsisVertical}
            />
        </Button>
    )
}
