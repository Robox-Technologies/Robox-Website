type CodeProvider = () => Promise<string> | string

let provider: CodeProvider | null = null

/**
 * Each editor implementation (block editor, future python editor, ...)
 * registers how it turns its project into code. `usePico` doesn't need to
 * know which editor is active — it just asks for the generated code.
 */
export function registerCodeProvider(getCode: CodeProvider): void {
    provider = getCode
}

export async function getGeneratedCode(): Promise<string> {
    if (!provider) {
        throw new Error('No code provider registered for this editor')
    }
    return provider()
}
