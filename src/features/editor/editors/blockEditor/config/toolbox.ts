import type { ExtensionKey } from 'src/types/extensions'
import type {
    BlockInfo,
    ToolboxDefinition,
    ToolboxItemInfo,
} from 'node_modules/blockly/core/utils/toolbox'
import baseToolbox from './baseToolbox.json'

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
    cssconfig: { icon: string }
    contents?: ToolboxBlock[]
    custom?: string
}
// Shape of baseToolbox.json: a separator follows each group of categories.
export type BaseToolboxConfig = {
    groups: Partial<Record<string, BaseToolboxCategory>>[]
}
const baseToolboxConfig: BaseToolboxConfig = baseToolbox

const ServoCategory: ToolboxItemInfo = {
    kind: 'category',
    name: 'Servo',
    cssconfig: {
        icon: 'categoryIcon fa fa-arrows-rotate',
    },
    categorystyle: 'servo_category',
    contents: [
        {
            kind: 'block',
            type: 'servo_angle',
        },
        {
            kind: 'block',
            type: 'servo_set_angle',
            inputs: {
                ANGLE: {
                    shadow: {
                        type: 'math_number',
                        fields: {
                            NUM: 90,
                        },
                    },
                },
            },
        },
        {
            kind: 'block',
            type: 'servo_rotate',
            inputs: {
                ANGLE: {
                    shadow: {
                        type: 'math_number',
                        fields: {
                            NUM: 90,
                        },
                    },
                },
            },
        },
        {
            kind: 'block',
            type: 'servo_get_angle',
        },
    ],
}
export const ExtensionCategories: Record<ExtensionKey, ToolboxItemInfo> = {
    SERVO: ServoCategory,
}
export const BaseToolbox: ToolboxDefinition = {
    kind: 'categoryToolbox',
    contents: baseToolboxConfig.groups.flatMap((group) => [
        ...Object.entries(group).map(([id, category]) => ({
            kind: 'category',
            toolboxitemid: id,
            ...category,
        })),
        { kind: 'sep' },
    ]),
}
