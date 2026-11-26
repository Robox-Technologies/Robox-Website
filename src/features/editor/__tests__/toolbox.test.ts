import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
    ExtensionContribution,
    RoboxCategory,
} from '@/features/editor/editors/blockEditor/config/toolbox'

vi.mock('@/utils/serialization', () => ({
    getProject: vi.fn(),
    getProjectIdFromURL: vi.fn(),
}))

const config = await vi.importActual<
    typeof import('@/features/editor/editors/blockEditor/config/toolbox')
>('@/features/editor/editors/blockEditor/config/toolbox')
const contributions: Record<string, { toolbox: ExtensionContribution }> = {}
vi.mock('@/features/editor/editors/blockEditor/config/toolbox', () => ({
    ...config,
    ExtensionToolbox: contributions,
}))

const { buildToolbox, getExtensionBlockTypes } =
    await import('@/features/editor/editors/blockEditor/utils/toolbox')

const categoryIds = (toolbox: ReturnType<typeof buildToolbox>) =>
    toolbox.contents.map((item) =>
        item.kind === 'category' ? item.toolboxitemid : 'sep',
    )
const blockTypes = (
    toolbox: ReturnType<typeof buildToolbox>,
    categoryId: string,
) => {
    const category = toolbox.contents.find(
        (item): item is RoboxCategory =>
            item.kind === 'category' && item.toolboxitemid === categoryId,
    )
    return category?.contents?.map((item) => ('type' in item ? item.type : ''))
}
const category = (id: string) => ({
    id,
    category: { name: id, categorystyle: '', cssconfig: { icon: '' } },
})
const contributeToServo = (toolbox: ExtensionContribution) => {
    contributions.SERVO = { toolbox }
}

beforeEach(() => {
    for (const key of Object.keys(contributions)) delete contributions[key]
    Object.assign(contributions, config.ExtensionToolbox)
})

describe('buildToolbox', () => {
    it('returns the base toolbox when no extension is enabled', () => {
        expect(buildToolbox({})).toEqual(config.BaseToolbox)
    })

    it('appends SERVO as the last category, as before', () => {
        expect(categoryIds(buildToolbox({ SERVO: true })).at(-1)).toBe('servo')
    })

    it('does not mutate the base toolbox', () => {
        const before = structuredClone(config.BaseToolbox)
        contributeToServo({
            blocks: { strings: [{ block: { kind: 'block', type: 'x' } }] },
        })
        buildToolbox({ SERVO: true })
        expect(config.BaseToolbox).toEqual(before)
    })

    it('places categories and blocks after their anchors in declared order', () => {
        contributeToServo({
            categories: [
                { ...category('a'), after: 'math' },
                { ...category('b'), after: 'math' },
            ],
            blocks: {
                control: [
                    {
                        after: 'controls_for',
                        block: { kind: 'block', type: 'one' },
                    },
                    {
                        after: 'controls_for',
                        block: { kind: 'block', type: 'two' },
                    },
                ],
                strings: [{ block: { kind: 'block', type: 'last' } }],
            },
        })
        const toolbox = buildToolbox({ SERVO: true })
        const ids = categoryIds(toolbox)
        expect(ids.slice(ids.indexOf('math'), ids.indexOf('math') + 3)).toEqual(
            ['math', 'a', 'b'],
        )
        const control = blockTypes(toolbox, 'control')!
        const at = control.indexOf('controls_for')
        expect(control.slice(at, at + 3)).toEqual([
            'controls_for',
            'one',
            'two',
        ])
        expect(blockTypes(toolbox, 'strings')!.at(-1)).toBe('last')
    })

    it('appends when an anchor is missing', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        contributeToServo({
            blocks: {
                math: [{ after: 'nope', block: { kind: 'block', type: 'x' } }],
            },
        })
        expect(blockTypes(buildToolbox({ SERVO: true }), 'math')!.at(-1)).toBe(
            'x',
        )
    })
})

describe('getExtensionBlockTypes', () => {
    it("lists the blocks of SERVO's category", () => {
        expect(getExtensionBlockTypes('SERVO')).toEqual(
            new Set([
                'servo_angle',
                'servo_set_angle',
                'servo_rotate',
                'servo_get_angle',
            ]),
        )
    })

    it('includes blocks added to existing categories', () => {
        contributeToServo({
            categories: [
                {
                    id: 'a',
                    category: {
                        ...category('a').category,
                        contents: [{ kind: 'block', type: 'own' }],
                    },
                },
            ],
            blocks: {
                math: [{ block: { kind: 'block', type: 'in_math' } }],
                strings: [{ block: { kind: 'block', type: 'in_strings' } }],
            },
        })
        expect(getExtensionBlockTypes('SERVO')).toEqual(
            new Set(['own', 'in_math', 'in_strings']),
        )
    })
})
