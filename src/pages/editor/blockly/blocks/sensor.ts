

import * as Blockly from 'blockly/core';
const sensors = [
    {
        "type": "ultrasonic_distance",
        "tooltip": "",
        "helpUrl": "",
        "message0": "%1 distance",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "sensor",
                "options": [
                    ["sensor", "0"]
                ]
            }
        ],
        "output": null,
        "style": "sensor_blocks",
        "inputsInline": true,
        "extensions": ["sensor_menu_extension"]
    },
    {
        "type": "color_sensor_value",
        "message0": "%1 colour sensor",
        "output": "String",
        "style": "sensor_blocks",
        "tooltip": "Returns the name of the closest detected colour",
        "helpUrl": "",
        "inputsInline": true,
        "args0": [
            {
                "type": "field_dropdown",
                "name": "sensor",
                "options": [
                    ["sensor", "0"]
                ]
            }
        ],
        "extensions": ["sensor_menu_extension"]
    },
    {
        "type": "color_sensor_is_colour",
        "message0": "%1 colour sensor sees %2",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "sensor",
                "options": [
                    ["sensor", "0"]
                ]
            },
            {
                "type": "field_colour",
                "name": "colour",
                "colour": "#ff0000",
                "colourOptions": [
                    "#ff0000",
                    "#ffa500",
                    "#ffff00",
                    "#008000",
                    "#0000ff",
                    "#800080",
                    "#000000",
                    "#ffffff"
                ]
            }
        ],
        "output": "Boolean",
        "style": "sensor_blocks",
        "tooltip": "Returns true if the closest colour matches the selected one",
        "helpUrl": "",
        "inputsInline": true,
        "extensions": ["sensor_menu_extension"]
    },
    {
        "type": "color_sensor_calibrate",
        "message0": "calibrate %1 colour sensor",
        "previousStatement": null,
        "nextStatement": null,
        "style": "sensor_blocks",
        "tooltip": "Calibrate the colour sensor against a white surface",
        "helpUrl": "",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "sensor",
                "options": [
                    ["sensor", "0"]
                ]
            }
        ],
        "extensions": ["sensor_menu_extension"]
    },
    {
        "type": "sensor_bool",
        "tooltip": "",
        "helpUrl": "",
        "message0": "%1 sensor is colour %2",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "sensor",
                "options": [
                    ["sensor", "0"]
                ]
            },
            {
                "type": "field_colour",
                "name": "colour",
                "colour": "#FFFFFF",
                "colourOptions": [
                    "#FFFFFF",
                    "#000000"
                ]
            }
        ],
        "output": "Boolean",
        "style": "sensor_blocks",
        "inputsInline": true,
        "extensions": ["sensor_menu_extension"]
    },
    {
        "type": "distance_bool",
        "tooltip": "",
        "helpUrl": "",
        "message0": "%1 distance is %2 %3",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "sensor",
                "options": [
                    ["sensor", "0"]
                ]
            },
            {
                "type": "field_dropdown",
                "name": "equality",
                "options": [
                    ["equal to", "=="],
                    ["closer than", "<"],
                    ["farther than", ">"]
                ]
            },
            {
                "type": "input_value",
                "name": "number",
                "check": "Number"
            }
        ],
        "style": "sensor_blocks",
        "output": "Boolean",
        "inputsInline": true,
        "extensions": ["sensor_menu_extension"]
    }
];




Blockly.defineBlocksWithJsonArray(sensors);

