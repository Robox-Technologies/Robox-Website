import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@components/dialog";
import Button from "@components/button";
import { faWarning } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";   
import { openProject } from "../stores/projectSettingsModal";
import { deleteProject } from "@utils/serialization";
import { openModal } from "@stores/modals";
export default function DeleteDialog() {
    const onDeleteProject = () => {
        const projectId = openProject.get();
        deleteProject(projectId!);
        openProject.set(null);
        openModal.set(null);
    }
    return (
         <Dialog id="deleteProjectDialog" className="h-fit">
            <DialogHeader>
                <div className="flex items-center text-xl font-bold">
                    <FontAwesomeIcon icon={faWarning} className="text-red mr-2 mb-0.5" />
                    <h2>Delete Project</h2>
                </div>
                
            </DialogHeader>

            <DialogBody>
                <div className="px-6 py-4">
                    <div className="bg-red/50 h-full w-full rounded-lg flex-col items-center justify-center p-4">
                        <p>
                            <span className="font-bold">Warning: </span> Deleting a project is irreversible. This action will remove:
                        </p>
                        <ul className="list-disc list-inside mt-2">
                            <li>The project and all its contents</li>
                            <li>All versions of the project</li>
                            <li>Associated assets and resources</li>
                        </ul>
                    </div>
                    <div className="mt-4">
                        <p className="text-black">Please confirm that you want to delete this project.</p>
                    </div>

                </div>
            </DialogBody>

            <DialogFooter>
                <Button
                    className="bg-black w-25 px-4 py-2 text-white rounded-xl hover:bg-gray-600 ml-auto transition-colors"
                    onClick={() => openModal.set(null)}
                >
                    Cancel
                </Button>
                <Button
                    className="bg-red w-25 px-4 py-2 text-white rounded-xl hover:bg-red-600 transition-colors"
                    onClick={onDeleteProject}
                >
                    Delete
                </Button>
            </DialogFooter>
        </Dialog>
    )
}