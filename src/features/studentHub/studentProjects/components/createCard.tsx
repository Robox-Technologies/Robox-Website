import { faPlus, faSquareBinary } from '@fortawesome/free-solid-svg-icons'
import { faPython } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Dialog, { DialogHeader, DialogBody } from '@/components/dialog'
import Button from '@/components/button'
import { createProject } from '@/utils/serialization'
import { editorHref } from '../utils/editorHref'
import type { ProjectType } from 'src/types/projects'

export default function CreateCard() {
    const onChoose = async (type: ProjectType) => {
        const id = await createProject(type)
        window.location.assign(editorHref(id))
    }
    return (
        <Dialog
            id="createProjectDialog"
            className="h-fit"
            trigger={(setIsOpen) => (
                // Shaped as a card rather than a button — same width, radius, hard
                // shadow and hover/press feedback as the project cards it sits beside.
                // `min-h` is what keeps it card-shaped when it's the only tile there;
                // alone it would otherwise collapse to the height of its own contents.
                //
                // `h-full` is what matches it to its siblings when there are any: the
                // flex item in the card row is Dialog's wrapper <div>, not this
                // button, so the row's stretch reached the wrapper and left the
                // button top-aligned inside it — a few pixels short at the bottom of
                // every project card beside it.
                <button
                    id="create-card"
                    className="card card-interactive box-shadow w-62.5 min-h-62.5 h-full rounded-3xl bg-blue flex flex-col items-center justify-center p-6 gap-4"
                    onClick={() => setIsOpen(true)}
                >
                    <div className="w-12 h-12 flex items-center justify-center">
                        <FontAwesomeIcon
                            icon={faPlus}
                            className="text-white text-4xl w-9 h-9 shrink-0"
                        />
                    </div>
                    <h1 className="text-white text-3xl font-normal">
                        New Project
                    </h1>
                </button>
            )}
        >
            <DialogHeader>
                <div className="flex items-center text-xl font-bold">
                    <h2>New Project</h2>
                </div>
            </DialogHeader>

            <DialogBody className="px-6 py-4">
                <p className="text-black mb-4">
                    How do you want to build your Ro/Box program?
                </p>
                <div className="flex flex-col gap-3">
                    <Button
                        className="bg-blue flex items-center justify-center gap-2 py-3"
                        onClick={() => onChoose('block')}
                    >
                        <FontAwesomeIcon
                            icon={faSquareBinary}
                            className="text-lg"
                        />
                        Block Editor
                    </Button>
                    <Button
                        className="bg-blue flex items-center justify-center gap-2 py-3"
                        onClick={() => onChoose('python')}
                    >
                        <FontAwesomeIcon icon={faPython} className="text-lg" />
                        Python Editor
                    </Button>
                </div>
            </DialogBody>
        </Dialog>
    )
}
