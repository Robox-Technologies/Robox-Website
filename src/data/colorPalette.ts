/**
 * The 8 colours the Ro/Box's colour sensor recognises - the block editor's
 * `color_sensor_is_colour` dropdown and generator, and the student hub's
 * colour calibration flow, both need this exact set, in the same order, so
 * it lives here once rather than as two hand-kept copies that can drift.
 */
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

/**
 * Recommended calibration order, not the dropdown/palette order above:
 * white and black set the sensor's brightness scale that every other
 * colour's reading passes through, so they have to go first or the 6 hues
 * calibrated before them need redoing.
 */
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
