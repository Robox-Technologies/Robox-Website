import * as Blockly from 'blockly/core';

const controls = [
    {
        "type": "controls_forever",
        "message0": "forever %1",
        "args0": [
            {
                "type": "input_statement",
                "name": "DO"
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "tooltip": "Repeat the enclosed blocks forever.",
        "helpUrl": "",
        "style": 'loop_blocks',

    }
]


Blockly.defineBlocksWithJsonArray(controls);