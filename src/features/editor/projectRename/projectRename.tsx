import { useContext } from "react"
import { EditorContext } from "@context/project";
export default function ProjectRename() {
    const { project, setProject } = useContext(EditorContext);
    
    return (
        <div className="project-rename flex items-center justify-center">
            <form autoComplete="off" className="flex gap-4 bg-white rounded-lg box-shadow " id="project-rename-form">
                <input type="text" name="projectName" id="project-name-input" value={project?.name} className="border border-gray-300 p-2 rounded-sm w-42 text-black" />
            </form>
        </div>
    )
}