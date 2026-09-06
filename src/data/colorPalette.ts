/** The 8 colours the colour sensor recognises. Order matters to both the editor and the hub. */
export const COLOR_PALETTE = [
    { name: 'red', hex: '#ff0000' },
    { name: 'orange', hex: '#ffa500' },
    { name: 'yellow', hex: '#ffff00' },
    { name: 'green', hex: '#008000' },
    { name: 'blue', hex: '#0000ff' },
    { name: 'purple', hex: '#800080' },
    { name: 'black', hex: '#000000' },
    { name: 'white', hex: '#ffffff' },
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
