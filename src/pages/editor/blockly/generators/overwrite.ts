import { pythonGenerator, Order } from 'blockly/python';
//overwriting the math_change block since its not valid on the pico
pythonGenerator.forBlock['math_change'] = function (block) {
    // Ensure nameDB_ exists, else fallback to a simple variable name
    const nameDB = pythonGenerator.nameDB_;
    const varNameRaw = block.getFieldValue('VAR') || 'item';

    const variable: string = nameDB
        ? nameDB.getName(varNameRaw, 'VARIABLE')
        : varNameRaw;

    const delta: string = pythonGenerator.valueToCode(
        block,
        'DELTA',
        Order.ADDITIVE
    ) || '0';

    return `${variable} = ${variable} + ${delta}\n`;
};