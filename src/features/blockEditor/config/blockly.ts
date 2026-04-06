import { RoboxFlyout, RoboxToolbox } from '../libs/roboxStyling'
import { ContinuousMetrics } from '@blockly/continuous-toolbox'
import theme from './roboxTheme'
import toolbox from '../utils/toolbox'

export const BlocklyConfig = {
    toolbox: toolbox(),
    theme: theme,
    plugins: {
        flyoutsVerticalToolbox: RoboxFlyout,
        toolbox: RoboxToolbox,
        MetricsManager: ContinuousMetrics,
    },
    modalInputs: false,
    zoom: {
        controls: false,
        maxScale: 2.5,
        minScale: 0.2,
        scaleSpeed: 1.5,
        startScale: 1.0,
        pinch: true,
    },
    move: {
        scrollbars: {
            horizontal: true,
            vertical: true,
        },
        drag: true,
        wheel: false,
    },
    grid: {
        spacing: 20,
        length: 5,
        colour: '#ccc',
    },
    renderer: 'Zelos',
    trashcan: false,
}
