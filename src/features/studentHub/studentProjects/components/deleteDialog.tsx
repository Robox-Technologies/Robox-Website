import { DialogBody, DialogFooter, DialogHeader } from '@/components/dialog'
import Dialog from '@/components/dialog'
import Button from '@/components/button'
import { faWarning } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { openProject } from '../stores/projectSettingsModal'
import { reloadProjects } from '../stores/projectsStore'
import { deleteProject } from '@/utils/serialization'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
export default function DeleteDialog() {
    const onDeleteProject = async () => {
        const projectId = openProject.get()
        if (projectId) await deleteProject(projectId)
        openProject.set(null)
        await reloadProjects()
    }
    return (
        <Dialog
            id="deleteProjectDialog"
            className="h-fit"
            trigger={(setIsOpen) => (
                <>
                    <Button
                        className="text-black! p-1.5! flex items-center justify-start gap-1.5"
                        onClick={(event) => {
                            event.stopPropagation()
                            event.preventDefault()
                            setIsOpen(true)
                        }}
                    >
                        <FontAwesomeIcon className="text-red" icon={faTrash} />{' '}
                        Delete
                    </Button>
                </>
            )}
        >
            <DialogHeader>
                <div className="flex items-center text-xl font-bold">
                    <FontAwesomeIcon
                        icon={faWarning}
                        className="text-red mr-2 mb-0.5"
                    />
                    <h2>Delete Project</h2>
                </div>
            </DialogHeader>

            <DialogBody
                className='overflow-visible'
            >
                <div className="px-6 py-4">
                    <div className="bg-red/50 h-full w-full rounded-lg flex-col items-center justify-center p-4">
                        <p>
                            <span className="font-bold">Warning: </span>
                            Deleting a project is irreversible. This action will
                            remove:
                        </p>
                        <ul className="list-disc list-inside mt-2">
                            <li>The project and all its contents</li>
                            <li>All versions of the project</li>
                            <li>Associated assets and resources</li>
                        </ul>
                    </div>
                    <div className="mt-4">
                        <p className="text-black">
                            Please confirm that you want to delete this project.
                        </p>
                    </div>
                </div>
            </DialogBody>

            <DialogFooter>
                <Button
                    className="bg-red w-25"
                    onClick={onDeleteProject}
                >
                    Delete
                </Button>
            </DialogFooter>
        </Dialog>
    )
}
