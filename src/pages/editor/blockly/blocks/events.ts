import Blockly from 'blockly/core';


const events = [
    {
        "type": "event_begin",
        "message0": "On start %1 %2",
        "args0": [
          {
            "type": "input_dummy"
          },
          {
            "type": "input_statement",
            "name": "event_code"
          }
        ],
        "style": "event_blocks",
        "tooltip": "Code to run when the event starts.",
        "helpUrl": "",
        "hat": "cap",
        "inputsInline": false
    }
]


Blockly.defineBlocksWithJsonArray(events);