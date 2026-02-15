import { createContext, useEffect, useState } from "react";
import { ProjectCard } from "./projectCard/projectCard";
import CreateCard from "./createCard";
import { openProject } from "../stores/projectSettingsModal";
import { useStore } from "@nanostores/react";
import { getProjects } from "@utils/serialization";
import type { UserProject } from "src/types/projects";
export default function Projects() {

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
                openProject.set(null);
            }

        }

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);


    return (
        <>
            <CreateCard />
            {Object.keys(projects).map((projectId) => (
                <ProjectCard key={projectId} id={projectId} />
            ))}
        </>
    );

}