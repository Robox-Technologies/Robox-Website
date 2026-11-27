import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

// Opens `createProjectDialog.astro`, rendered beside this island in `studentProjects.astro`.
export default function CreateCard() {
    return (
        // `min-h` keeps it card-shaped when it's the only tile; `h-full` matches its siblings.
        <button
            type="button"
            id="create-card"
            className="card card-interactive box-shadow w-62.5 min-h-62.5 h-full rounded-3xl bg-blue flex flex-col items-center justify-center p-6 gap-4"
            onClick={() =>
                document
                    .querySelector<HTMLDialogElement>('#createProjectDialog')
                    ?.showModal()
            }
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
