import Card from "@components/card";
import { faSquareBinary } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ProjectSettings from "./projectSettings";
import { useState } from "react";
export function ProjectCard() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Card
            className="bg-white w-[250px] border-transparent border-4 transition-transform hover:-translate-y-0.5 hover:border-blue duration-100 hover:cursor-pointer "
            image={<img alt="Project Image" className="w-full object-cover bg-tone3 aspect-video" />}
            title={
                <>
                    <div className="flex flex-row justify-center items-center gap-2">
                        <FontAwesomeIcon className="h-6 w-5 text-blue -transform-y-1" icon={faSquareBinary} />
                        <h3 className="text-xl font-bold">Untitled</h3>
                    </div>
                    <ProjectSettings />
                </>
            }
            description={<p className="text-gray-700">21 hours ago</p>}
        />
    )
}