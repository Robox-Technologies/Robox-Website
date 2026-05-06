import { useState, useRef } from 'react'
import Button from '@components/button'
import Dialog from '@components/dialog'
import { faPlus, faCube, faCode } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createProject } from '@utils/serialization'

export default function CreateCard() {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedType, setSelectedType] = useState<'block' | 'python' | null>(
        null,
    )
    const dialogRef = useRef<HTMLDialogElement>(null)

    const handleCreateProject = () => {
        if (!selectedType) return
        const id = createProject(selectedType)
        setIsOpen(false)
        setSelectedType(null)
        window.location.href = `/student/editor/index.html?id=${id}`
    }

    return (
        <Dialog
            ref={dialogRef}
            trigger={(setIsOpen) => (
                <Button
                    id="create-card"
                    className="w-[250px] rounded-lg bg-blue flex flex-col items-center justify-center p-6 gap-4 hover:cursor-pointer"
                    onClick={() => setIsOpen(true)}
                >
                    <div className="w-12 h-12 flex items-center justify-center">
                        <FontAwesomeIcon
                            icon={faPlus}
                            className="text-white text-4xl w-9 h-9 shrink-0"
                        />
                    </div>
                    <h1 className="text-white text-3xl font-normal">New Project</h1>
                </Button>
            )}
        >
            <div className="p-6 pt-12 flex flex-col gap-8">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                        Create New Project
                    </h2>
                    <p className="text-gray-600">
                        Choose the type of project you'd like to create
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <button
                        onClick={() => setSelectedType('block')}
                        className={`flex flex-col items-center justify-center py-8 px-6 rounded-lg transition-all ${
                            selectedType === 'block'
                                ? 'bg-blue text-white'
                                : 'bg-gray-200 text-gray-400 hover:bg-gray-300 hover:text-gray-600'
                        }`}
                    >
                        <FontAwesomeIcon
                            icon={faCube}
                            className="text-5xl mb-3"
                        />
                        <span className="text-sm font-medium text-inherit">Block</span>
                    </button>
                    <button
                        onClick={() => setSelectedType('python')}
                        className={`flex flex-col items-center justify-center py-8 px-6 rounded-lg transition-all ${
                            selectedType === 'python'
                                ? 'bg-blue text-white'
                                : 'bg-gray-200 text-gray-400 hover:bg-gray-300 hover:text-gray-600'
                        }`}
                    >
                        <FontAwesomeIcon
                            icon={faCode}
                            className="text-5xl mb-3"
                        />
                        <span className="text-sm font-medium text-inherit">Python</span>
                    </button>
                </div>

                <Button
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                        selectedType
                            ? 'bg-blue text-white hover:bg-blue/90'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={handleCreateProject}
                    disabled={!selectedType}
                >
                    Create Project
                </Button>
            </div>
        </Dialog>
    )
}
