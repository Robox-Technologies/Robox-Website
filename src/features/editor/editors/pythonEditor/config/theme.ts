import type { editor } from 'monaco-editor/editor/editor.api'

// Colours from the `--color-*` tokens in global.css, not Monaco's `vs` defaults.
// Shared with utils/screenshot.ts so the thumbnail's colours can never drift from
// what the live editor actually renders -- edit this file, not a copy of it.
export const pythonTheme: editor.IStandaloneThemeData = {
    base: 'vs',
    inherit: true,
    rules: [
        { token: 'comment', foreground: '717171', fontStyle: 'italic' },
        // Darker tints of --color-green/--color-yellow; the brand hexes are too light here.
        { token: 'string', foreground: '4f7619' },
        { token: 'string.escape', foreground: 'ff6166' },
        { token: 'number', foreground: '916d08', fontStyle: 'bold' },
        { token: 'number.hex', foreground: '916d08', fontStyle: 'bold' },
        { token: 'keyword', foreground: '2588c7', fontStyle: 'bold' },
        { token: 'identifier', foreground: '405c64' },
        { token: 'delimiter', foreground: '717171' },
        { token: 'tag', foreground: 'ff6166' },
    ],
    colors: {
        'editor.background': '#f8f8f8',
        'editor.foreground': '#405c64',
        'editorGutter.background': '#efefef',
        'editorLineNumber.foreground': '#717171',
        'editorLineNumber.activeForeground': '#405c64',
        'editorCursor.foreground': '#2588c7',
        'editor.selectionBackground': '#2588c74d',
        'editor.lineHighlightBackground': '#2588c714',
        'editor.lineHighlightBorder': '#00000000',
        'editorIndentGuide.background': '#c6c6c6',
        'editorIndentGuide.activeBackground': '#2588c7',
    },
}
