import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "@components/button";

export default function ProjectSettings() {
    return (
        <Button  className="ml-auto pr-0 -transform-y-1 bg-transparent hover:bg-transparent text-black! hover:text-black! w-8 h-8 flex items-center justify-center p-0 hover:cursor-pointer">
            <FontAwesomeIcon className="w-5 h-5 text-black" icon={faEllipsisVertical} />
        </Button>
    );
}