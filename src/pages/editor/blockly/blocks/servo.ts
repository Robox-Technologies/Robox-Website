import * as Blockly from 'blockly/core';
const servos = [
    {
        "type": "servo_set_angle",
        "message0": "set servo angle to %1°",
        "args0": [
            {
                "type": "input_value",
                "name": "ANGLE",
                "check": "Number"
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "style": "movement_blocks",
        "tooltip": "Sets the servo to the specified angle (0–180°)",
        "helpUrl": "",
        "inputsInline": true
    },
    {
        "type": "servo_rotate",
        "message0": "rotate servo by %1°",
        "args0": [
            {
                "type": "input_value",
                "name": "ANGLE",
                "check": "Number"
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "style": "movement_blocks",
        "tooltip": "Rotates the servo relative to its current position",
        "helpUrl": "",
        "inputsInline": true
    },
    {
        "type": "servo_get_angle",
        "message0": "current servo angle",
        "output": "Number",
        "style": "sensor_blocks",
        "tooltip": "Returns the last known angle of the servo",
        "helpUrl": "",
        "inputsInline": true
    }
];
Blockly.defineBlocksWithJsonArray(servos);