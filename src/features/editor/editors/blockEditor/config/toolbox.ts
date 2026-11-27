import type { ExtensionKey } from 'src/types/extensions'
import type { BlockInfo } from 'node_modules/blockly/core/utils/toolbox'
import baseToolbox from './baseToolbox.json'
import extensions from '@/data/extensions.json'

// TS infers JSON arrays by giving each element its siblings' keys as `?: undefined`,
// so the records below are Partial. The JSON itself never holds undefined.
type ConnectionState = NonNullable<BlockInfo['inputs']>[string]
export type ToolboxBlock = Omit<BlockInfo, 'inputs'> & {
    type: string
    inputs?: Partial<Record<string, ConnectionState>>
}
export type BaseToolboxCategory = {
    name: string
    categorystyle: string
    // Applied to blocks extensions add to this category, so they match its colour.
    blockstyle?: string
    cssconfig: { icon: string }
    contents?: ToolboxBlock[]
    custom?: string
}
// Shape of baseToolbox.json: a separator follows each group of categories.
export type BaseToolboxConfig = {
    groups: Partial<Record<string, BaseToolboxCategory>>[]
}
const baseToolboxConfig: BaseToolboxConfig = baseToolbox

type BaseGroup = (typeof baseToolbox.groups)[number]
export type BaseCategoryId = BaseGroup extends unknown ? keyof BaseGroup : never

// Blockly's category types omit `toolboxitemid`, which is how we address categories.
export type RoboxCategory = BaseToolboxCategory & {
    kind: 'category'
    toolboxitemid: string
}
export type RoboxToolbox = {
    kind: 'categoryToolbox'
    contents: (RoboxCategory | { kind: 'sep' })[]
}

// The `toolbox` of an extension in extensions.json. `after` anchors on a category
// id / block type (plain strings, since JSON can't hold literal types); without
// it the item is appended.
export type ExtensionContribution = {
    categories?: {
        id: string
        after?: string
        category: BaseToolboxCategory
    }[]
    blocks?: Partial<
        Record<BaseCategoryId, { after?: string; block: ToolboxBlock }[]>
    >
}
export const ExtensionToolbox: Record<
    ExtensionKey,
    { toolbox: ExtensionContribution }
> = extensions
export const BaseToolbox: RoboxToolbox = {
    kind: 'categoryToolbox',
    contents: baseToolboxConfig.groups.flatMap((group) => [
        ...Object.entries(group)
            .filter(
                (entry): entry is [string, BaseToolboxCategory] => !!entry[1],
            )
            .map(([id, category]) => ({
                kind: 'category' as const,
                toolboxitemid: id,
                ...category,
            })),
        { kind: 'sep' as const },
    ]),
}
