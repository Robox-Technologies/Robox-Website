import * as Blockly from 'blockly/core';

const motorBlocks = [
  {
    "type": "motor_stop",
    "message0": "stop motors",
    "previousStatement": null,
    "nextStatement": null,
    "style": "motor_blocks",
    "tooltip": "Stops all motors",
    "helpUrl": ""
  },
  {
    "type": "motor_reverse",
    "message0": "reverse motors",
    "previousStatement": null,
    "nextStatement": null,
    "style": "motor_blocks",
    "tooltip": "Switch motor directions",
    "helpUrl": ""
  },
  {
    "type": "motor_move_simple",
    "message0": "move %1",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "direction",
        "options": [
          ["FORWARD", "forward"],
          ["BACKWARD", "backward"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "style": "motor_blocks",
    "tooltip": "Move both motors forward or backward",
    "helpUrl": ""
  },
  {
    "type": "motor_turn_simple",
    "message0": "turn %1",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "direction",
        "options": [
          ["LEFT", "left"],
          ["RIGHT", "right"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "style": "motor_blocks",
    "tooltip": "Turn left or right",
    "helpUrl": ""
  },
  {
    "type": "motor_set_speed",
    "message0": "set motor speed to %1 %%",
    "args0": [
      {
        "type": "input_value",
        "name": "speed",
        "check": "Number"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "style": "motor_blocks",
    "tooltip": "Set global motor speed",
    "helpUrl": ""
  },
  {
  "type": "motor_dual_speed",
  "message0": "Move motors at Left: %1 %%  Right: %2 %%",
  "args0": [
    {
      "type": "input_value",
      "name": "left_speed",
      "check": "Number"
    },
    {
      "type": "input_value",
      "name": "right_speed",
      "check": "Number"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "style": "motor_blocks",
  "tooltip": "Run left and right motors at given speeds",
  "helpUrl": ""
},
{
  "type": "motor_dual_speed_duration",
  "message0": "Move motors at Left: %1 %%  Right: %2 %% for %3 seconds",
  "args0": [
    {
      "type": "input_value",
      "name": "left_speed",
      "check": "Number"
    },
    {
      "type": "input_value",
      "name": "right_speed",
      "check": "Number"
    },
    {
      "type": "input_value",
      "name": "duration",
      "check": "Number"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "style": "motor_blocks",
  "tooltip": "Run motors at given speeds for a certain time",
  "helpUrl": ""
}
];

Blockly.defineBlocksWithJsonArray(motorBlocks);
