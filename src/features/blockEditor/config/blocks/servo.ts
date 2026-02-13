import * as Blockly from 'blockly/core';

const servo = [
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
        "style": "servo_blocks",
        "tooltip": "Sets the servo to the specified angle (0–180°)",
        "helpUrl": "",
        "inputsInline": true
    },
    {
        "type": "servo_rotate",
        "message0": "rotate servo by %1",
        "args0": [
            {
                "type": "input_value",
                "name": "ANGLE",
                "check": "Number"
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "style": "servo_blocks",
        "tooltip": "Rotates the servo relative to its current position",
        "helpUrl": "",
        "inputsInline": true
    },
    {
        "type": "servo_get_angle",
        "message0": "current servo angle",
        "output": "Number",
        "style": "servo_blocks",
        "tooltip": "Returns the last known angle of the servo",
        "helpUrl": "",
        "inputsInline": true
    },
    {
        "type": "servo_angle",
        "style": "servo_blocks",
        "message0": "angle %1°",
        "args0": [
            {
                "type": "field_angle",
                "name": "ANGLE",
                "value": 0,
                "min": 0,
                "max": 180,
                "precision": 1,
                "displayMin": 0,
                "displayMax": 360,
            }
        ],
        "output": "Number",
        "tooltip": "Select an angle between 0 and 180 degrees",
        "helpUrl": ""
    },
];

Blockly.defineBlocksWithJsonArray(servo);