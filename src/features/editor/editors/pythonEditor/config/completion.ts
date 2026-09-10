// The bare editor.api entry point doesn't wire up the suggest widget/commands
// (editor.action.triggerSuggest etc.) -- that's a separate contribution that
// has to be pulled in as a side effect, same as any other opt-in Monaco feature.
import 'monaco-editor/editor/contrib/suggest/browser/suggestController.js'
import { languages, Range } from 'monaco-editor/editor/editor.api'
import type { Position, editor as editorNamespace } from 'monaco-editor/editor/editor.api'

const KEYWORDS = [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
    'while', 'with', 'yield',
]

const BUILTINS = [
    'print', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'dict',
    'set', 'tuple', 'abs', 'min', 'max', 'sum', 'sorted', 'reversed',
    'enumerate', 'zip', 'map', 'filter', 'isinstance', 'type', 'round',
]

const RESERVED = new Set([...KEYWORDS, ...BUILTINS])
const IDENTIFIER_PATTERN = /[A-Za-z_]\w*/g

// Monaco's own word-based suggestions rely on a worker service we don't wire
// up, so variable/function names the student has already typed (however
// they were defined -- assignment, `def`, `for`, ...) are collected here by
// just scanning the buffer instead of parsing it.
function getDocumentIdentifiers(
    model: editorNamespace.ITextModel,
    currentWord: string,
): string[] {
    const seen = new Set<string>()
    for (const match of model.getValue().matchAll(IDENTIFIER_PATTERN)) {
        const identifier = match[0]
        if (identifier !== currentWord && !RESERVED.has(identifier)) {
            seen.add(identifier)
        }
    }
    return [...seen]
}

const SNIPPETS: { label: string; insertText: string; doc: string }[] = [
    { label: 'if', insertText: 'if ${1:condition}:\n\t$0', doc: 'If statement' },
    { label: 'elif', insertText: 'elif ${1:condition}:\n\t$0', doc: 'Else-if branch' },
    { label: 'else', insertText: 'else:\n\t$0', doc: 'Else branch' },
    { label: 'for', insertText: 'for ${1:item} in ${2:iterable}:\n\t$0', doc: 'For loop' },
    { label: 'while', insertText: 'while ${1:condition}:\n\t$0', doc: 'While loop' },
    { label: 'def', insertText: 'def ${1:name}(${2:args}):\n\t$0', doc: 'Function definition' },
    { label: 'try', insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception}:\n\t$0', doc: 'Try/except block' },
]

function registerPythonCompletionProvider() {
    languages.registerCompletionItemProvider('python', {
        provideCompletionItems(model: editorNamespace.ITextModel, position: Position) {
            const word = model.getWordUntilPosition(position)
            const range = new Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn,
            )

            return {
                suggestions: [
                    ...KEYWORDS.map((keyword) => ({
                        label: keyword,
                        kind: languages.CompletionItemKind.Keyword,
                        insertText: keyword,
                        range,
                    })),
                    ...BUILTINS.map((builtin) => ({
                        label: builtin,
                        kind: languages.CompletionItemKind.Function,
                        insertText: builtin,
                        range,
                    })),
                    ...getDocumentIdentifiers(model, word.word).map((identifier) => ({
                        label: identifier,
                        kind: languages.CompletionItemKind.Variable,
                        insertText: identifier,
                        range,
                    })),
                    ...SNIPPETS.map((snippet) => ({
                        label: snippet.label,
                        kind: languages.CompletionItemKind.Snippet,
                        detail: snippet.doc,
                        insertText: snippet.insertText,
                        insertTextRules:
                            languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                    })),
                ],
            }
        },
    })
}

let registered = false

// Guards against double registration if this module is ever evaluated more
// than once in the same page (e.g. HMR); Monaco would otherwise show every
// suggestion twice.
export function ensurePythonCompletionProvider() {
    if (registered) return
    registered = true
    registerPythonCompletionProvider()
}
