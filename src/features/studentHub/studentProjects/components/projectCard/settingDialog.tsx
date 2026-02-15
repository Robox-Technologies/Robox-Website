import Button from "@components/button";
import { faTrash, faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { openModal } from "@stores/modals";
export default function SettingDialog() {
    const onClick = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
    }
    const onDeleteClick = (event: React.MouseEvent) => {
        console.log("delete click");
        openModal.set("deleteProjectDialog");
        event.stopPropagation();
        event.preventDefault();
    }
    return (
        <dialog id="project-settings-dialog" className="modal w-32 bg-white rounded-lg drop-shadow-lg border-2 border-black absolute top-45 left-54 flex flex-col z-100" onClick={onClick}>
            <Button className="text-black! p-1.5! flex items-center justify-start gap-1.5 hover:cursor-pointer">
                <FontAwesomeIcon className="text-blue" icon={faPencil} /> Edit
            </Button>
            <Button className="text-black! p-1.5! flex items-center justify-start gap-1.5 hover:cursor-pointer" onClick={onDeleteClick}>
                <FontAwesomeIcon className="text-red" icon={faTrash} /> Delete
            </Button>
        </dialog>
    );
}