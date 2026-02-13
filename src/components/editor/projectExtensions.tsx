import Button from "@components/button";
import { openModal } from "@stores/modals";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";

export default function ProjectExtensions() {
    return (
        <Button className="text-white h-4 w-4 p-0! flex justify-center items-center" icon={faPuzzlePiece} onClick={() => {
            openModal.set("extensionsDialog");
        }} />
    )
}