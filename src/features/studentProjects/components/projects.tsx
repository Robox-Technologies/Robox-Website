import { createContext, useEffect, useState } from "react";
import { ProjectSettingsModalContext } from "@context/projectSettingsModal";
import { ProjectCard } from "./projectCard";
export default function Projects() {
    const [openProject, setOpenProject] = useState<string | null>(null);


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


    const projects = [1, 2, 3];
    return (
        <ProjectSettingsModalContext.Provider value={{ openProject, setOpenProject }}>
            {projects.map((project) => (<ProjectCard key={project} id={String(project)} />))}
        </ProjectSettingsModalContext.Provider>
    );

}