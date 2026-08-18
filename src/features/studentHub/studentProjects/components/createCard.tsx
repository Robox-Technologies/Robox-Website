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
        // Shaped as a card rather than a button — same width, radius, hard
        // shadow and hover/press feedback as the project cards it sits beside.
        // `min-h` is what keeps it card-shaped when it's the only tile there:
        // with siblings the row's stretch matches it to them, alone it would
        // otherwise collapse to the height of its own contents.
        <button
            id="create-card"
            className="card card-interactive box-shadow w-62.5 min-h-62.5 rounded-3xl bg-blue flex flex-col items-center justify-center p-6 gap-4"
            onClick={onClick}
        >
            <div className="w-12 h-12 flex items-center justify-center">
                <FontAwesomeIcon
                    icon={faPlus}
                    className="text-white text-4xl w-9 h-9 shrink-0"
                />
            </div>
            <h1 className="text-white text-3xl font-normal">New Project</h1>
        </button>
    )
}
