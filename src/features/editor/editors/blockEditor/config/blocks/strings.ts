import * as Blockly from 'blockly/core'

const strings = [
    {
        type: 'text_format',
        message0: 'format %1 with %2',
        args0: [
            {
                type: 'field_input',
                name: 'TEMPLATE',
                text: 'Hello, {0}!',
            },
            {
                type: 'input_value',
                name: 'VALUE',
            },
        ],
        inputsInline: true,
        output: 'String',
        style: 'text_blocks',
        tooltip:
            'Replaces {0} in the template with the value. Example: Hello, {0}!',
        helpUrl: '',
    },
]

Blockly.defineBlocksWithJsonArray(strings)
