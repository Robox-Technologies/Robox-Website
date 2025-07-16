import * as Blockly from 'blockly/core';

const systems = [
    {
        "type": "sleep",
        "message0": "wait for %1 seconds",
        "args0": [
            {
                "type": "input_value",
                "name": "time",
                "check": "Number"
            }
        ],
        "inputsInline": true,
        "previousStatement": null,
        "nextStatement": null,
        "style": "system_blocks",
        "tooltip": "Pauses the program for a set amount of time.",
        "helpUrl": ""
    },
    {
        "type": "led_toggle",
        "message0": "toggle LED",
        "inputsInline": true,
        "previousStatement": null,
        "nextStatement": null,
        "style": "system_blocks",
        "tooltip": "Switches the LED between on and off.",
        "helpUrl": ""
    },
    {
        "type": "led_bool",
        "message0": "set LED to %1",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "state",
                "options": [
                    ["ON", "1"],
                    ["OFF", "0"]
                ]
            }
        ],
        "inputsInline": true,
        "previousStatement": null,
        "nextStatement": null,
        "style": "system_blocks",
        "tooltip": "Sets the LED to the specified state.",
        "helpUrl": ""
    },
    {
        "type": "get_time",
        "message0": "get current time",
        "inputsInline": true,
        "output": "Number",
        "style": "system_blocks",
        "tooltip": "Returns the current system time.",
        "helpUrl": ""
    },
    {
        "type": "get_led_state",
        "message0": "get LED state",
        "inputsInline": true,
        "output": "Boolean",
        "style": "system_blocks",
        "tooltip": "Returns the current state of the LED.",
        "helpUrl": ""
    },
    {
        "type": "wait_until",
        "message0": "wait until %1 is true",
        "args0": [
            {
                "type": "input_value",
                "name": "bool",
                "check": "Boolean"
            }
        ],
        "inputsInline": true,
        "previousStatement": null,
        "nextStatement": null,
        "style": "system_blocks",
        "tooltip": "Waits until the specified condition is true.",
        "helpUrl": ""
    },
    {
        "type": "print",
        "message0": "print %1",
        "args0": [
            {
                "type": "input_value",
                "name": "string",
                "check": "String"
            }
        ],
        "inputsInline": true,
        "previousStatement": null,
        "nextStatement": null,
        "style": "system_blocks",
        "tooltip": "Outputs a string to the console or display.",
        "helpUrl": ""
    }
]


Blockly.defineBlocksWithJsonArray(systems);