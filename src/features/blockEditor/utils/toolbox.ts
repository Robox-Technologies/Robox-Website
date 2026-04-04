import type { ToolboxDefinition } from 'node_modules/blockly/core/utils/toolbox'
import {
    BaseToolbox,
    ExtensionCategories,
} from '@features/blockEditor/config/toolbox'
import { id } from '@features/blockEditor/stores/editor'
import { getProject } from '@utils/serialization'
import type { ExtensionKey } from 'src/types/extensions'

//TODO: Make this dynamic
export default function generateToolbox(): ToolboxDefinition {
    const projectId = id.get()
    if (!projectId) return BaseToolbox
    const project = getProject(projectId)
    if (!project) return BaseToolbox
    const extensions = project.extensions
    const toolbox = structuredClone(BaseToolbox)
    if (typeof toolbox !== 'object' || !('contents' in toolbox))
        return BaseToolbox
    for (const extKey in extensions) {
        if (extensions[extKey as ExtensionKey] === true) {
            const category =
                ExtensionCategories[extKey as keyof typeof ExtensionCategories]
            if (category) {
                toolbox.contents.push(category)
            }
        }
    }
    return toolbox
}
