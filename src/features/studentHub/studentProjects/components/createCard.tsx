import Button from '@/components/button'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createProject } from '@/utils/serialization'
import { editorHref } from '../utils/editorHref'
export default function CreateCard() {
    const onClick = async () => {
        const id = await createProject()

        window.location.assign(editorHref(id))
    }
    return (
        <Button
            id="create-card"
            className="w-[250px] rounded-lg bg-blue flex flex-col items-center justify-center p-6 gap-4"
            onClick={onClick}
        >
            <div className="w-12 h-12 flex items-center justify-center">
                <FontAwesomeIcon
                    icon={faPlus}
                    className="text-white text-4xl w-9 h-9 shrink-0"
                />
            </div>
            <h1 className="text-white text-3xl font-normal">New Project</h1>
        </Button>
    )
}
