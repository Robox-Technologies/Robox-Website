import Button from "@components/button";
import { faTrash, faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Font from "astro/components/Font.astro";
export default function SettingDialog() {
    return (
        <dialog id="project-settings-dialog" className="modal w-32 bg-white rounded-lg drop-shadow-lg border-2 border-black absolute top-45 left-54 flex flex-col z-100">
            <Button className="text-black! p-1.5! flex items-center justify-start gap-1.5 hover:cursor-pointer">
                <FontAwesomeIcon className="text-blue" icon={faPencil} /> Edit
            </Button>
            <Button className="text-black! p-1.5! flex items-center justify-start gap-1.5 hover:cursor-pointer">
                <FontAwesomeIcon className="text-red" icon={faTrash} /> Delete
            </Button>
        </dialog>
    );
}