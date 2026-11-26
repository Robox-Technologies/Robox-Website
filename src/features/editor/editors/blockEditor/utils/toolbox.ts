import type { ToolboxDefinition } from 'node_modules/blockly/core/utils/toolbox'
import {
    BaseToolbox,
    ExtensionToolbox,
    type BaseCategoryId,
    type RoboxToolbox,
} from '@/features/editor/editors/blockEditor/config/toolbox'
import { getProject, getProjectIdFromURL } from '@/utils/serialization'
import extensions from '@/data/extensions.json'
import type { ExtensionKey } from 'src/types/extensions'
import type { UserExtensions } from 'src/types/projects'
import type { WorkspaceSvg } from 'blockly/core'

const extensionKeys = Object.keys(extensions) as ExtensionKey[]

export default async function generateToolbox(): Promise<RoboxToolbox> {
    const projectId = getProjectIdFromURL()
    if (!projectId) return BaseToolbox
    const project = await getProject(projectId)
    return buildToolbox(project?.extensions ?? {})
}

export function buildToolbox(enabled: Partial<UserExtensions>): RoboxToolbox {
    const toolbox = structuredClone(BaseToolbox)
    const contributions = extensionKeys
        .filter((key) => enabled[key] === true)
        .map((key) => ExtensionToolbox[key].toolbox)

    insertAfterAnchors(
        toolbox.contents,
        contributions.flatMap(({ categories = [] }) =>
            categories.map(({ id, after, category }) => ({
                after,
                item: {
                    kind: 'category' as const,
                    toolboxitemid: id,
                    ...category,
                },
            })),
        ),
        (item, anchor) =>
            item.kind === 'category' && item.toolboxitemid === anchor,
    )

    for (const category of toolbox.contents) {
        if (category.kind !== 'category' || !category.contents) continue
        const categoryId = category.toolboxitemid as BaseCategoryId
        insertAfterAnchors(
            category.contents,
            contributions.flatMap(({ blocks = {} }) =>
                (blocks[categoryId] ?? []).map(({ after, block }) => ({
                    after,
                    item: block,
                })),
            ),
            (item, anchor) => item.type === anchor,
        )
    }
    return toolbox
}

export function getExtensionBlockTypes(key: ExtensionKey): Set<string> {
    const { categories = [], blocks = {} } = ExtensionToolbox[key].toolbox
    const categoryBlocks = categories.flatMap(
        ({ category }) => category.contents ?? [],
    )
    const addedBlocks = Object.values(blocks).flatMap(
        (additions) => additions?.map(({ block }) => block) ?? [],
    )
    return new Set([...categoryBlocks, ...addedBlocks].map(({ type }) => type))
}

// Items with the same anchor go in together, in the order given. Items with no
// anchor, or whose anchor isn't in the list, go at the end.
function insertAfterAnchors<T>(
    list: T[],
    placements: { after?: string; item: T }[],
    isAnchor: (item: T, anchor: string) => boolean,
) {
    const appended: T[] = []
    const byAnchor = new Map<string, T[]>()
    for (const { after, item } of placements) {
        const copy = structuredClone(item)
        if (after === undefined) appended.push(copy)
        else byAnchor.set(after, [...(byAnchor.get(after) ?? []), copy])
    }

    for (const [anchor, items] of byAnchor) {
        const index = list.findIndex((item) => isAnchor(item, anchor))
        if (index === -1) {
            console.warn(`Toolbox anchor "${anchor}" not found, appending`)
            appended.push(...items)
        } else {
            list.splice(index + 1, 0, ...items)
        }
    }
    list.push(...appended)
}

export function updateToolboxPreservingScroll(
    workspace: WorkspaceSvg,
    toolbox: ToolboxDefinition,
) {
    const flyoutWorkspace = workspace.getFlyout()?.getWorkspace()
    const scrollY = flyoutWorkspace?.scrollY ?? 0

    workspace.updateToolbox(toolbox)

    requestAnimationFrame(() => {
        const updatedFlyoutWorkspace = workspace.getFlyout()?.getWorkspace()
        updatedFlyoutWorkspace?.scroll(0, scrollY)
        workspace.getToolbox()?.refreshSelection()
    })
}
