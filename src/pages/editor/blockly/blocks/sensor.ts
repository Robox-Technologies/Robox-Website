

import * as Blockly from 'blockly/core';
const sensors = [
    {
        "type": "ultrasonic_distance",
        "tooltip": "",
        "helpUrl": "",
        "message0": "distance",
        "output": null,
        "style": "sensor_blocks",
        "inputsInline": true
    },
        {
        "type": "color_sensor_value",
        "message0": "colour sensor",
        "output": "String",
        "style": "sensor_blocks",
        "tooltip": "Returns the name of the closest detected colour",
        "helpUrl": "",
        "inputsInline": true
    },
    {
        "type": "color_sensor_is_colour",
        "message0": "colour sensor sees %1",
        "args0": [
            {
                "type": "field_colour",
                "name": "colour",
                "colour": "#ff0000",
                "colourOptions": [
                    "#ff0000",  // red
                    "#ffa500",  // orange
                    "#ffff00",  // yellow
                    "#008000",  // green
                    "#0000ff",  // blue
                    "#800080",  // purple
                    "#000000",  // black
                    "#ffffff"   // white
                ]
            }
        ],
        "output": "Boolean",
        "style": "sensor_blocks",
        "tooltip": "Returns true if the closest colour matches the selected one",
        "helpUrl": "",
        "inputsInline": true
    },
    {
        "type": "color_sensor_calibrate",
        "message0": "calibrate colour sensor",
        "previousStatement": null,
        "nextStatement": null,
        "style": "sensor_blocks",
        "tooltip": "Calibrate the colour sensor against a white surface",
        "helpUrl": ""
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
                    ["left", "0"],
                    ["right", "1"]
                ]
            },
            {
                "type": "field_colour",
                "name": "colour",
                "colour": "#FFFFFF",
                "colourOptions": ['#FFFFFF', '#000000']
            }
        ],
        "output": "Boolean",
        "style": "sensor_blocks",
        "inputsInline": true
    },
    {
        "type": "distance_bool",
        "tooltip": "",
        "helpUrl": "",
        "message0": "distance is %1 %2",
        "args0": [
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
        "inputsInline": true
    }
]



Blockly.defineBlocksWithJsonArray(sensors);

