import extensions from '@data/extensions.json'
const extensionsConfig = extensions as const

export type ExtensionKey = keyof typeof extensionsConfig
export type ExtensionTags = 'software' | 'hardware' | 'customization'
export const extensionKeys = Object.keys(
    extensionsConfig,
) as const as ExtensionKey[]
declare module '@data/extensions.json' {
    export interface Extension {
        name: string
        description: string
        emoji: string
        tag: ExtensionTags
    }
    const extensions: Record<ExtensionKey, Extension>
    export default extensions
}
