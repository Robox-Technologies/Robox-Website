import { editor } from 'monaco-editor/editor/editor.api'
import 'monaco-editor/languages/definitions/python/register'
import { pythonTheme } from '../config/theme'

const WIDTH = 500
const HEIGHT = Math.round(WIDTH * (9 / 16))
const PADDING = 10
// Base (1x) monospace metrics; scaled uniformly so the code's own extent fills the frame,
// the same way Blockly zooms its workspace bounding box to fill the thumbnail.
const BASE_FONT_SIZE = 11
const BASE_LINE_HEIGHT = 14
const BASE_CHAR_WIDTH = 6.6
// A short snippet shouldn't blow up to a giant font, and a single very long line shouldn't
// shrink everything to unreadable dust -- clamp how far the fit is allowed to zoom in either direction.
const MIN_SCALE = 0.5
const MAX_SCALE = 3
// Cap the code's own height, not just the overall zoom: fitting more and more lines into the
// same frame would keep shrinking the font past readable, so past this many lines the preview
// just stops -- extra lines get cropped instead of the text getting smaller to fit them in.
const MAX_HEIGHT_LINES = 20
const additionalXOffset = 25;

// Everything below is derived from `pythonTheme` (the same object `editor.astro` feeds into
// `editor.defineTheme`) rather than copied, so editing that one file is enough to re-colour
// the thumbnail too -- no second table to remember to update.
const BACKGROUND = pythonTheme.colors?.['editor.background'] ?? '#f8f8f8'
const DEFAULT_COLOR = pythonTheme.colors?.['editor.foreground'] ?? '#405c64'

// Keyed by scope prefix, most specific first, since e.g. a string's quote characters
// are tokenized as `string.escape` and must win over the plainer `string` rule.
const TOKEN_COLORS: Record<string, string> = Object.fromEntries(
    pythonTheme.rules
        .filter((rule) => rule.foreground)
        .map((rule) => [rule.token, `#${rule.foreground}`]),
)

function colorForToken(type: string): string {
    // Tokens come as e.g. `string.escape.python` -- strip the trailing language id, then
    // walk from the most specific scope down to the least specific looking for a rule.
    const segments = type.replace(/\.python$/, '').split('.')
    for (let length = segments.length; length > 0; length--) {
        const color = TOKEN_COLORS[segments.slice(0, length).join('.')]
        if (color) return color
    }
    return DEFAULT_COLOR
}

// Bracket pair colorization is on by default (`EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions`)
// and is what actually colours brackets in the live editor -- it's a decoration layer on top of
// the lexical theme rules above, not something `tokenize()` reports, so it can't be read off
// `pythonTheme.rules`. It reads its colours from `pythonTheme.colors` like anything else Monaco
// themes, though, so an override there is still picked up automatically; only the fallback
// (Monaco's built-in default light-theme `editorBracketHighlight.foreground1/2/3`) is hardcoded.
const BRACKET_COLORS = [
    pythonTheme.colors?.['editorBracketHighlight.foreground1'] ?? '#0431fa',
    pythonTheme.colors?.['editorBracketHighlight.foreground2'] ?? '#319331',
    pythonTheme.colors?.['editorBracketHighlight.foreground3'] ?? '#7b3814',
]
const BRACKET_OPEN = new Set(['(', '[', '{'])
const BRACKET_CLOSE = new Set([')', ']', '}'])

function isBracketDelimiter(type: string): boolean {
    return (
        type.startsWith('delimiter.parenthesis') ||
        type.startsWith('delimiter.bracket') ||
        type.startsWith('delimiter.curly')
    )
}

// `editor.tokenize()` only returns real token types once python's Monarch grammar
// (lazy-loaded by `languages/definitions/python/register`) has finished loading; called
// too early it silently returns blank tokens. `colorize()` is the public API that awaits
// that load internally, so firing it once here doubles as a warm-up for `tokenize()` below.
const pythonTokenizerReady = editor.colorize('', 'python', {}).then(
    () => {},
    () => {},
)

/** Renders a syntax-coloured preview of `code`, zoomed to a tight fit, to a 500px-wide, 16:9 PNG. */
export async function codeToPng(code: string): Promise<string> {
    await pythonTokenizerReady
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.textBaseline = 'top'

    const codeLines = code.split('\n').slice(0, MAX_HEIGHT_LINES)
    // Trailing blank lines shouldn't count towards the bounding box -- otherwise
    // trailing whitespace in the file zooms the actual code out for no reason.
    while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === '') {
        codeLines.pop()
    }

    const maxLineLength = codeLines.reduce(
        (max, line) => Math.max(max, line.length),
        0,
    )
    if (codeLines.length === 0 || maxLineLength === 0) {
        return canvas.toDataURL('image/png')
    }

    const availableWidth = WIDTH - PADDING * 2
    const availableHeight = HEIGHT - PADDING * 2
    const scale = Math.min(
        MAX_SCALE,
        Math.max(
            MIN_SCALE,
            Math.min(
                availableWidth / (maxLineLength * BASE_CHAR_WIDTH),
                availableHeight / (codeLines.length * BASE_LINE_HEIGHT),
            ),
        ),
    )
    const fontSize = BASE_FONT_SIZE * scale
    const lineHeight = BASE_LINE_HEIGHT * scale
    const charWidth = BASE_CHAR_WIDTH * scale

    const offsetX = (WIDTH - maxLineLength * charWidth - additionalXOffset) / 2
    const offsetY = (HEIGHT - codeLines.length * lineHeight) / 2

    ctx.font = `${fontSize}px monospace`

    const tokenizedLines = editor.tokenize(codeLines.join('\n'), 'python')
    let bracketDepth = 0

    tokenizedLines.forEach((tokens, lineIndex) => {
        const lineText = codeLines[lineIndex] ?? ''
        const y = offsetY + lineIndex * lineHeight

        tokens.forEach((token, tokenIndex) => {
            const end = tokens[tokenIndex + 1]?.offset ?? lineText.length
            const text = lineText.slice(token.offset, end)
            if (!text) return

            if (isBracketDelimiter(token.type)) {
                // Drawn character-by-character: a run of adjacent brackets (e.g. `))`) can
                // land in a single token, and each one is its own nesting depth/colour.
                for (let i = 0; i < text.length; i++) {
                    const ch = text[i]
                    if (BRACKET_CLOSE.has(ch)) {
                        bracketDepth = Math.max(0, bracketDepth - 1)
                    }
                    ctx.fillStyle = BRACKET_COLORS[bracketDepth % BRACKET_COLORS.length]
                    ctx.fillText(ch, offsetX + (token.offset + i) * charWidth, y)
                    if (BRACKET_OPEN.has(ch)) {
                        bracketDepth++
                    }
                }
                return
            }

            const x = offsetX + token.offset * charWidth
            ctx.fillStyle = colorForToken(token.type)
            ctx.fillText(text, x, y)
        })
    })

    try {
        return canvas.toDataURL('image/png')
    } catch {
        console.warn('Error converting python code to a thumbnail png')
        return ''
    }
}
