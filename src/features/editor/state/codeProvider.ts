type CodeProvider = () => Promise<string> | string

let provider: CodeProvider | null = null

/** Each editor registers how it turns its project into code, so `usePico` can stay unaware of which is active. */
export function registerCodeProvider(getCode: CodeProvider): void {
    provider = getCode
}

export async function getGeneratedCode(): Promise<string> {
    if (!provider) {
        throw new Error('No code provider registered for this editor')
    }
    return provider()
}
