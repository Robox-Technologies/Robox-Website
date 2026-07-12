import { useEffect, useRef, useState } from 'react'
import { editProject, getProject } from '@/utils/serialization'
import { getProjectIdFromURL } from '@/features/blockEditor/utils/serialization'
export default function ProjectRename() {
    const projectId = getProjectIdFromURL()
    const [projectName, setProjectName] = useState('Untitled')
    // Guards against persisting the placeholder name before the stored one has
    // loaded (the load is async, so the save effect can fire first otherwise).
    const loaded = useRef(false)

    useEffect(() => {
        if (!projectId) return
        let active = true
        getProject(projectId).then((project) => {
            if (!active) return
            if (project) setProjectName(project.name || 'Untitled')
            loaded.current = true
        })
        return () => {
            active = false
        }
    }, [projectId])
    useEffect(() => {
        if (!projectId || !loaded.current) return
        editProject(projectId, { name: projectName })
    }, [projectName, projectId])

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
