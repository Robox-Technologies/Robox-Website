/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/*
This toolbox contains nearly every single built-in block that Blockly offers,
in addition to the custom block 'add_text' this sample app adds.
You probably don't need every single block, and should consider either rewriting
your toolbox from scratch, or carefully choosing whether you need each block
listed here.
*/
export const toolbox = {
    'kind': 'categoryToolbox',
    'contents': [
    {
        'kind': 'category',
        'name': 'Events',
        "cssConfig": {
            "icon": "categoryIcon fa fa-flag",
        },
        'categorystyle': 'events_category',
        'contents': [
            {
                'kind': 'block',
                'type': 'event_begin',
            },
        ]
    },
    {
        'kind': 'sep',
    },
    {
        'kind': 'category',
        'name': 'Logic',
        "cssConfig": {
            "icon": "categoryIcon fa fa-cog"
        },
        'categorystyle': 'logic_category',
        'contents': [         
            {
                'kind': 'block',
                'type': 'controls_if',
            },
            {
                'kind': 'block',
                'type': 'logic_compare',
            },
            {
                'kind': 'block',
                'type': 'logic_operation',
            },
            {
                'kind': 'block',
                'type': 'logic_negate',
            },
            {
                'kind': 'block',
                'type': 'logic_boolean',
            },
            {
                'kind': 'block',
                'type': 'logic_ternary',
            },
        ],
    },
    {
        'kind': 'category',
        'name': 'Control',
        'categorystyle': 'loop_category',
        "cssConfig": {
            "icon": "categoryIcon fa fa-repeat"
        },
        'contents': [
            {
            'kind': 'block',
            'type': 'controls_repeat_ext',
            'inputs': {
              'TIMES': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 10,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'controls_whileUntil',
          },
          {
            'kind': 'block',
            'type': 'controls_forever',
          },
          {
            'kind': 'block',
            'type': 'controls_for',
            'inputs': {
              'FROM': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 1,
                  },
                },
              },
              'TO': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 10,
                  },
                },
              },
              'BY': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 1,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'controls_forEach',
          },
          {
            'kind': 'block',
            'type': 'controls_flow_statements',
          },
        ],
      },
      {
        'kind': 'category',
        'name': 'Math',
        'categorystyle': 'math_category',
        "cssConfig": {
            "icon": "categoryIcon fa fa-plus"
        },
        'contents': [
          {
            'kind': 'block',
            'type': 'math_number',
            'fields': {
              'NUM': 123,
            },
          },
          {
            'kind': 'block',
            'type': 'math_arithmetic',
            'inputs': {
              'A': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 1,
                  },
                },
              },
              'B': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 1,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'math_single',
            'inputs': {
              'NUM': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 9,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'math_trig',
            'inputs': {
              'NUM': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 45,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'math_constant',
          },
          {
            'kind': 'block',
            'type': 'math_number_property',
            'inputs': {
              'NUMBER_TO_CHECK': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 0,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'math_round',
            'fields': {
              'OP': 'ROUND',
            },
            'inputs': {
              'NUM': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 3.1,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'math_on_list',
            'fields': {
              'OP': 'SUM',
            },
          },
          {
            'kind': 'block',
            'type': 'math_modulo',
            'inputs': {
              'DIVIDEND': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 64,
                  },
                },
              },
              'DIVISOR': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 10,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'math_constrain',
            'inputs': {
              'VALUE': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 50,
                  },
                },
              },
              'LOW': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 1,
                  },
                },
              },
              'HIGH': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 100,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'math_random_int',
            'inputs': {
              'FROM': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 1,
                  },
                },
              },
              'TO': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 100,
                  },
                },
              },
            },
          },
        ],
      },
      {
        'kind': 'category',
        'name': 'Lists',
        'categorystyle': 'list_category',
        "cssConfig": {
            "icon": "categoryIcon fa fa-table-list"
        },
        'contents': [
          {
            'kind': 'block',
            'type': 'lists_create_with',
          },
          {
            'kind': 'block',
            'type': 'lists_repeat',
            'inputs': {
              'NUM': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 5,
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'lists_length',
          },
          {
            'kind': 'block',
            'type': 'lists_isEmpty',
          },
          {
            'kind': 'block',
            'type': 'lists_indexOf',
            'inputs': {
              'VALUE': {
                'block': {
                  'type': 'variables_get',
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'lists_getIndex',
            'inputs': {
              'VALUE': {
                'block': {
                  'type': 'variables_get',
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'lists_setIndex',
            'inputs': {
              'LIST': {
                'block': {
                  'type': 'variables_get',
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'lists_getSublist',
            'inputs': {
              'LIST': {
                'block': {
                  'type': 'variables_get',
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'lists_split',
            'inputs': {
              'DELIM': {
                'shadow': {
                  'type': 'text',
                  'fields': {
                    'TEXT': ',',
                  },
                },
              },
            },
          },
          {
            'kind': 'block',
            'type': 'lists_sort',
          },
          {
            'kind': 'block',
            'type': 'lists_reverse',
          },
        ],
      },
      {
        'kind': 'sep',
      },
      {
        'kind': 'category',
        'name': 'Sensors',
        'categorystyle': 'sensor_category',
        "cssConfig": {
            "icon": "categoryIcon fa fa-eye"
        },
        'contents': [
            {
                "kind": "block",
                "type": "ultrasonic_distance"
            },
            {
                "kind": "block",
                "type": "sensor_bool"
            },
            {
                "kind": "block",
                "type": "distance_bool",
                "inputs": {
                    "number": {
                        "shadow": {
                            "type": "math_number",
                            "fields": {
                                "NUM": 10
                            }
                        }
                    }
                }
            }
        ]
      },
      {
        'kind': 'category',
        'name': 'System',
        'categorystyle': 'system_category',
        "cssConfig": {
            "icon": "categoryIcon fa fa-robot"
        },
        'contents': [
          {
            'kind': 'block',
            'type': 'sleep',
            "inputs": {
              'time': {
                'shadow': {
                  'type': 'math_number',
                  'fields': {
                    'NUM': 1,
                  },
                },
              },
            }
          },
          {
          "kind": "block",
          "type": "print",
          "inputs": {
              "string": {
                  "shadow": {
                      "type": "text",
                      "fields": {
                          "TEXT": ""
                      }
                  }
              }
          }
          },
          {
            'kind': 'block',
            'type': 'led_toggle',
          },
          {
            'kind': 'block',
            'type': 'led_bool',
          },
          {
            'kind': 'block',
            'type': 'get_time',
          },
          {
            'kind': 'block',
            'type': 'get_led_state',
          },
          {
            'kind': 'block',
            'type': 'wait_until',
          },
          
        ]
      },
      {
  "kind": "category",
  "name": "Motors",
  "categorystyle": "motor_category",
  "cssConfig": {
    "icon": "categoryIcon fa fa-truck-monster"
  },
  "contents": [
    {
      "kind": "block",
      "type": "motor_stop"
    },
    {
      "kind": "block",
      "type": "motor_reverse"
    },
    {
      "kind": "block",
      "type": "motor_move_simple"
    },
    {
      "kind": "block",
      "type": "motor_turn_simple"
    },
    {
      "kind": "block",
      "type": "motor_set_speed",
      "inputs": {
        "speed": {
          "shadow": {
            "type": "math_number",
            "fields": {
              "NUM": 50
            }
          }
        }
      }
    },
    {
      "kind": "block",
      "type": "motor_dual_speed",
      "inputs": {
        "left_speed": {
          "shadow": {
            "type": "math_number",
            "fields": {
              "NUM": 50
            }
          }
        },
        "right_speed": {
          "shadow": {
            "type": "math_number",
            "fields": {
              "NUM": 50
            }
          }
        }
      }
    },
    {
      "kind": "block",
      "type": "motor_dual_speed_duration",
      "inputs": {
        "left_speed": {
          "shadow": {
            "type": "math_number",
            "fields": {
              "NUM": 50
            }
          }
        },
        "right_speed": {
          "shadow": {
            "type": "math_number",
            "fields": {
              "NUM": 50
            }
          }
        },
        "duration": {
          "shadow": {
            "type": "math_number",
            "fields": {
              "NUM": 2
            }
          }
        }
      }
    }
  ]
},
      {
        'kind': 'sep',
      },
      {
        'kind': 'category',
        'name': 'Variables',
        "cssConfig": {
            "icon": "categoryIcon fa fa-x"
        },
        'categorystyle': 'variable_category',
        'custom': 'VARIABLE',
      },
      {
        'kind': 'category',
        'name': 'Functions',
        "cssConfig": {
            "icon": "categoryIcon fa fa-gears"
        },
        'contents': [
        ],
        'categorystyle': 'procedure_category',
        'custom': 'PROCEDURE',
      },
    ],
  };
  