import * as Blockly from 'blockly/core'
import {
    BaseToolbox,
    ExtensionToolbox,
    type RoboxCategory,
} from '@/features/editor/editors/blockEditor/config/toolbox'

// Blocks an extension adds to an existing category take that category's
// `blockstyle`, e.g. lists_split (a list block) shown under Strings. Call once
// every block definition has been registered.
export function applyCategoryBlockStyles() {
    for (const { toolbox } of Object.values(ExtensionToolbox)) {
        for (const [categoryId, additions] of Object.entries(
            toolbox.blocks ?? {},
        )) {
            const style = BaseToolbox.contents.find(
                (item): item is RoboxCategory =>
                    item.kind === 'category' &&
                    item.toolboxitemid === categoryId,
            )?.blockstyle
            if (!style) continue
            for (const { block } of additions ?? []) {
                setBlockStyle(block.type, style)
            }
        }
    }
}

function setBlockStyle(type: string, style: string) {
    const definition = Blockly.Blocks[type] as
        { init?: (this: Blockly.Block) => void } | undefined
    if (!definition?.init) {
        console.warn(`Can't restyle "${type}": block isn't registered`)
        return
    }
    const init = definition.init
    definition.init = function (this: Blockly.Block) {
        init.call(this)
        this.setStyle(style)
    }
}
