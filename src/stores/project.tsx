import type { UserProject } from "src/types/projects";
import { createContext} from "react";
export const EditorContext = createContext<{
    project: UserProject & { id: string } | null;
    setProject: (project: UserProject & { id: string } | null) => void;
}>({
    project: null,
    setProject: () => {},
});