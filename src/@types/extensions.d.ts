import extensions from '@data/extensions.json';
const extensionsConfig = extensions as const;

export type ExtensionKey = keyof typeof extensionsConfig;
declare module "@data/extensions.json" {
    export interface Extension {
        name: string;
        description: string;
    }
    const extensions: Record<ExtensionKey, Extension>;
    export default extensions;
}