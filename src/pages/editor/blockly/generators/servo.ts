import { pythonGenerator, Order } from 'blockly/python'

pythonGenerator.forBlock['servo_set_angle'] = function () {
    const value_angle = this.getInputTargetBlock('ANGLE') ?
    pythonGenerator.valueToCode(this, 'ANGLE', Order.NONE) : '0';
    const code = `servo.rotate_to_angle(${value_angle})\n`;
    return code;
}
pythonGenerator.forBlock['servo_rotate'] = function () {
    const value_angle = this.getInputTargetBlock('ANGLE') ?
    pythonGenerator.valueToCode(this, 'ANGLE', Order.NONE) : '0';
    //TODO: Check angle limits (and give wraparound warning)
    const code = `servo.rotate_by_angle(servo.angle + ${value_angle})\n`;
    return code;
}
pythonGenerator.forBlock['servo_get_angle'] = function () {
    const code = 'servo.angle';
    return [code, Order.ATOMIC];
}