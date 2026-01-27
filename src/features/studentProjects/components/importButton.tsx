import Button from "@components/button"
import { faDownload } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
export default function ImportButton() {
    return (
        <Button className="bg-white text-black! hover:bg-[#eee] text-lg flex flex-row items-center gap-2 px-4 py-2 rounded-full drop-shadow-sm hover:cursor-pointer">
            <FontAwesomeIcon className="w-5 h-5" icon={faDownload} />
            Import 
        </Button>
    )
}