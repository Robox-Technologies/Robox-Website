import { describe, it, expect } from 'vitest'
import * as Blockly from 'blockly/core'
import * as En from 'blockly/msg/en'
import 'blockly/blocks'
import { applyCategoryBlockStyles } from '@/features/editor/editors/blockEditor/utils/blockStyles'

// @ts-expect-error the locale module's type doesn't match setLocale's
Blockly.setLocale(En)
applyCategoryBlockStyles()
const workspace = new Blockly.Workspace()
const styleOf = (type: string) => workspace.newBlock(type).getStyleName()

describe('applyCategoryBlockStyles', () => {
    it("gives blocks added to a category that category's colour", () => {
        expect(styleOf('lists_split')).toBe('text_blocks')
        expect(styleOf('controls_forEach')).toBe('loop_blocks')
        expect(styleOf('math_on_list')).toBe('math_blocks')
    })

    it("leaves the extension's own category blocks alone", () => {
        expect(styleOf('lists_create_with')).toBe('list_blocks')
    })
})
