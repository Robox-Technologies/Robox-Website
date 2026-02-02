import {EditorContext} from "@context/project"
import { useEffect, useState, useContext } from "react"
import { getProject } from "@utils/serialization";
import type { UserProject } from "@@types/projects";
export default function ProjectContext({ children }: { children?: React.ReactNode }) {
    const [project, setProject] = useState<UserProject & { id: string } | null>(null);
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (!id) return;
        const projectData = getProject(id);
        if (!projectData) return;
        const projectWithId = { ...projectData, id };
        setProject(projectWithId);
    }, []);
    return (
        <EditorContext.Provider value={{ project, setProject }}>
            {children}
        </EditorContext.Provider>
    )
}