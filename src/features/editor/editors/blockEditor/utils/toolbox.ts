import type { ToolboxDefinition } from 'node_modules/blockly/core/utils/toolbox'
import {
    BaseToolbox,
    ExtensionCategories,
} from '@/features/editor/editors/blockEditor/config/toolbox'
import { getProject } from '@/utils/serialization'
import type { ExtensionKey } from 'src/types/extensions'
import { getProjectIdFromURL } from './serialization'

//TODO: Make this dynamic
export default async function generateToolbox(): Promise<ToolboxDefinition> {
    const projectId = getProjectIdFromURL()
    if (!projectId) return BaseToolbox
    const project = await getProject(projectId)
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
