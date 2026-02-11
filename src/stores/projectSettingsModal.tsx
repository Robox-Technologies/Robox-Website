import { createContext} from "react";
export const ProjectSettingsModalContext = createContext<{
    setOpenProject: (projectId: string | null) => void;
    openProject: string | null;
}>({
    setOpenProject: () => {},
    openProject: null,
});