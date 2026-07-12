import { useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { ProjectCard } from './projectCard/projectCard'
import CreateCard from './createCard'
import { openProject } from '../stores/projectSettingsModal'
import { projectsStore, reloadProjects } from '../stores/projectsStore'
export default function Projects() {
    const projects = useStore(projectsStore)

    // Load projects on the client (storage is unavailable during SSR).
    useEffect(() => {
        reloadProjects()
    }, [])
    // Close project settings modal when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                event.target instanceof HTMLElement &&
                !event.target.closest('.project-card')
            ) {
                openProject.set(null)
            }
        }

        document.addEventListener('click', handleClickOutside)
        return () => {
            document.removeEventListener('click', handleClickOutside)
        }
    }, [])

    return (
        <>
            <CreateCard />
            {Object.entries(projects).map(([projectId, project]) => (
                <ProjectCard key={projectId} id={projectId} project={project} />
            ))}
        </>
    )
}
