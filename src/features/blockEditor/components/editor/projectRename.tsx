import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'
import { editProject, getProject } from '@utils/serialization'
import { getProjectIdFromURL } from '@features/blockEditor/utils/serialization'
export default function ProjectRename() {
    const projectId = getProjectIdFromURL()
    const [projectName, setProjectName] = useState('')
    useEffect(() => {
        if (projectId) {
            const project = getProject(projectId)
            if (project) {
                setProjectName(project.name)
            }
        }
    }, [projectId])
    useEffect(() => {
        if (projectId) {
            const project = getProject(projectId)
            if (project) {
                editProject(projectId, {
                    ...project,
                    name: projectName,
                })
            }
        }
    }, [projectName])

    return (
        <div className="project-rename flex items-center justify-center">
            <form
                autoComplete="off"
                className="flex gap-4 bg-white rounded-lg box-shadow "
                id="project-rename-form"
            >
                <input
                    type="text"
                    name="projectName"
                    id="project-name-input"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="border border-gray-300 p-2 rounded-sm w-42 text-black"
                />
            </form>
        </div>
    )
}
