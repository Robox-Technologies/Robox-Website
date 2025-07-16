import * as Blockly from 'blockly';
// FORGIVE ME but for some reason blockly does not have every theme work in typescript
// there is an active pull (https://github.com/google/blockly-samples/pull/2474) but has not been merged yet
//So gotta ignore TS complaining for now



Blockly.Msg.EVENT_COLOR = "#277DA1";


Blockly.Msg.LOGIC_COLOR = "#F94144"
Blockly.Msg.LOOPS_COLOR = "#F3722C"
Blockly.Msg.MATH_COLOR = "#F8961E"
Blockly.Msg.LISTS_COLOR = "#F9844A"

Blockly.Msg.SENSOR_COLOR = "#FFCD44";
Blockly.Msg.SYSTEM_COLOR = "#90BE6D";
Blockly.Msg.MOTOR_COLOR = "#43AA8B";

Blockly.Msg.VARIABLES_COLOR = "#4D908E";
Blockly.Msg.PROCEDURES_COLOR = "#577590";









export default Blockly.Theme.defineTheme('Robox', {
    name: "robox",
    'base': Blockly.Themes.Classic,
    componentStyles: {
        'workspaceBackgroundColour': '#F5F5F5',
        'toolboxBackgroundColour': "#FFFFFF",
        'flyoutBackgroundColour': '#F5F5F5',
        'flyoutOpacity': 1,
    },
    categoryStyles: {
        'logic_category': {
            'colour': '%{BKY_LOGIC_COLOR}'
        },
        'loop_category': {
            'colour': '%{BKY_LOOPS_COLOR}'
        },
        'math_category': {
            'colour': '%{BKY_MATH_COLOR}'
        },
        'list_category': {
            'colour': '%{BKY_LISTS_COLOR}'
        },
        'sensor_category': {
            'colour': '%{BKY_SENSOR_COLOR}'
        },
        'motor_category': {
            'colour': '%{BKY_MOTOR_COLOR}'
        },
        "system_category": {
            'colour': '%{BKY_SYSTEM_COLOR}'
        },
        "events_category": {
            'colour': '%{BKY_EVENT_COLOR}'
        },
        "variable_category": {
            'colour': '%{BKY_VARIABLES_COLOR}'
        },
        "procedure_category": {
            'colour': '%{BKY_PROCEDURES_COLOR}'
        },
    },
    blockStyles: {
        'logic_blocks': {
            'colourPrimary': '%{BKY_LOGIC_COLOR}',
        },
        'loop_blocks': {
            'colourPrimary': '%{BKY_LOOPS_COLOR}'

        },
        'math_blocks': {
            'colourPrimary': '%{BKY_MATH_COLOR}'
        },
        'list_blocks': {
            'colourPrimary': '%{BKY_LISTS_COLOR}',
            'colourSecondary': "#FFFFFF"
        },
        'sensor_blocks': {
            'colourPrimary': '%{BKY_SENSOR_COLOR}'
        },
        'motor_blocks': {
            'colourPrimary': '%{BKY_MOTOR_COLOR}'
        },
        "system_blocks": {
            'colourPrimary': '%{BKY_SYSTEM_COLOR}'
        },
        "event_blocks": {
            'colourPrimary': '%{BKY_EVENT_COLOR}'
        },
        "variable_blocks": {
            'colourPrimary': '%{BKY_VARIABLES_COLOR}'
        },
        "procedure_blocks": {
            'colourPrimary': '%{BKY_PROCEDURES_COLOR}'
        },
        
    },


    startHats: true
});