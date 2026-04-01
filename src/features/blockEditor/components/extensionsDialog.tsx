import { DialogHeader, DialogBody, DialogFooter } from '@components/dialog'
import Dialog from '@components/dialog'
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ExtensionKey, ExtensionTags } from 'src/types/extensions'
import extensions from '@data/extensions.json'
import { Toggle } from '@components/toggle'
import { useEffect, useState } from 'react'
import generateToolbox from '../utils/toolbox'
import { setUserExtension } from '../utils/serialization'
import { id } from '@features/blockEditor/stores/editor'
import * as Blockly from 'blockly'
import { getProject } from '@utils/serialization'
import ProjectExtensions from '@features/blockEditor/components/editor/projectExtensions'

export default function ExtensionsDialog() {
    const extensionKeys = Object.keys(extensions) as (keyof typeof extensions)[]

    return (
        <Dialog
            id="extensionsDialog"
            className="h-175"
            trigger={(setIsOpen) => <ProjectExtensions setIsOpen={setIsOpen} />}
        >
            <DialogHeader>
                <div className="flex items-center text-xl font-bold">
                    <FontAwesomeIcon
                        icon={faPuzzlePiece}
                        className="text-green mr-2 mb-0.5"
                    />
                    <h2>Extensions</h2>
                </div>
            </DialogHeader>
            <DialogBody className="flex flex-col items-center justify-start p-4 gap-4">
                {extensionKeys.map((extension) => (
                    <ExtensionCard key={extension} extension={extension} />
                ))}
            </DialogBody>

            <DialogFooter></DialogFooter>
        </Dialog>
    )
}

function ExtensionCard({ extension }: { extension: ExtensionKey }) {
    const [isEnabled, setIsEnabled] = useState(false)
    useEffect(() => {
        const projectId = id.get()
        if (!projectId) return
        const project = getProject(projectId)
        if (!project) return
        setIsEnabled(project.extensions[extension] === true)
    }, [extension])
    const extensionData = extensions[extension]
    return (
        <div className="border border-gray-300 rounded-lg p-4 w-full hover:bg-gray-100 transition">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg text-gray-800 font-semibold">
                        {extensionData.emoji} {extensionData.name}
                    </h3>
                    <ExtensionTag tag={extensionData.tag as ExtensionTags} />
                </div>
                <Toggle
                    enabled={isEnabled ?? false}
                    onToggle={() => {
                        toggleExtension(extension, !isEnabled, setIsEnabled)
                    }}
                />
            </div>
            <p className="text-gray-500 text-sm">{extensionData.description}</p>
        </div>
    )
}
function toggleExtension(
    extension: ExtensionKey,
    enabled: boolean,
    setEnabled: (enabled: boolean) => void,
) {
    setEnabled(enabled)
    setUserExtension(extension, enabled)
    const toolbox = generateToolbox()
    const workspace = Blockly.getMainWorkspace()
    if (!(workspace instanceof Blockly.WorkspaceSvg)) {
        console.error('Workspace is not of type Blockly.WorkspaceSvg')
        return
    }
    workspace.updateToolbox(toolbox)
    workspace.getToolbox()?.refreshSelection()
}
function ExtensionTag({ tag }: { tag: ExtensionTags }) {
    const colors: Record<ExtensionTags, string> = {
        software: 'bg-blue-100 text-blue-500',
        hardware: 'bg-green-100 text-green-500',
        customization: 'bg-purple-100 text-purple-500',
    }
    return (
        <span
            className={`inline-block px-2 py-1 text-xs font-medium rounded ${colors[tag]}`}
        >
            {tag}
        </span>
    )
}
