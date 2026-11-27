/**
 * The 8 colours the colour sensor recognises. Order matters to both the editor and the hub.
 * `hex` is stored in saved projects by the colour block, so it must never change;
 * `display` is only how the hub's calibration dialog paints the colour (brand palette,
 * with orange and purple borrowed from the editor's Math and Text blocks).
 */
export const COLOR_PALETTE = [
    { name: 'red', hex: '#ff0000', display: 'var(--color-red)' },
    { name: 'orange', hex: '#ffa500', display: '#f8961e' },
    { name: 'yellow', hex: '#ffff00', display: 'var(--color-yellow)' },
    { name: 'green', hex: '#008000', display: 'var(--color-green)' },
    { name: 'blue', hex: '#0000ff', display: 'var(--color-blue)' },
    { name: 'purple', hex: '#800080', display: '#9b5de5' },
    { name: 'black', hex: '#000000', display: 'var(--color-drop-shadow)' },
    { name: 'white', hex: '#ffffff', display: '#ffffff' },
] as const

export type PaletteColor = (typeof COLOR_PALETTE)[number]
export type PaletteColorName = PaletteColor['name']

/** Calibration order, not palette order: white and black set the brightness scale, so they go first. */
export const CALIBRATION_ORDER: readonly PaletteColorName[] = [
    'white',
    'black',
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
]
