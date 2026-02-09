import { createContext, useEffect, useState } from "react";
import { ProjectSettingsModalContext } from "@stores/projectSettingsModal";
import { ProjectCard } from "./projectCard";
import CreateCard from "./createCard";
import { getProjects } from "@utils/serialization";
import type { UserProject } from "@@types/projects";
export default function Projects() {
    const [openProject, setOpenProject] = useState<string | null>(null);
    const [projects, setProjects] = useState<Record<string, UserProject>>({});

    //Make sure the localstorage runs only on client side
    useEffect(() => {
        const storedProjects = getProjects();
        setProjects(storedProjects);
    }, []);
    // Close project settings modal when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (event.target instanceof HTMLElement && !event.target.closest('.project-card')) {
                setOpenProject(null); // close project
            }
        }

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [setOpenProject]);


    return (
        <ProjectSettingsModalContext.Provider value={{ openProject, setOpenProject }}>
            <CreateCard />
            {Object.keys(projects).map((projectId) => (
                <ProjectCard key={projectId} id={projectId} />
            ))}
        </ProjectSettingsModalContext.Provider>
    );

}