
import { pythonGenerator } from 'blockly/python'
pythonGenerator.forBlock['controls_forever'] = function (block, generator) {
    const statements_do = generator.statementToCode(block, 'DO');
    const code = `while True:\n${statements_do || '    pass\n'}`;
    return code;
};
