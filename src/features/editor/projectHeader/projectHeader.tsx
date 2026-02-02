import Button from "@components/button";
import ProjectRename from "@features/editor/projectRename/projectRename.tsx";
import { faChevronLeft, faGear } from "@fortawesome/free-solid-svg-icons";
export default function ProjectHeader() {
    return (
        <div className="editorHeader flex flex-row justify-between items-center h-18 bg-red border-b-2 border-black px-8">
            <Button href="/student" icon={faChevronLeft} className="text-white h-4 w-4 p-0! flex justify-center items-center"/>
            <ProjectRename />
            <Button href="/student" icon={faGear} className="text-white h-4 w-4 p-0! flex justify-center items-center"/>
        </div>
    )
}