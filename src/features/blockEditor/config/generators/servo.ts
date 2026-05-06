import { pythonGenerator, Order } from 'blockly/python'

pythonGenerator.forBlock['servo_set_angle'] = function (block, generator) {
    const value_angle = block.getInputTargetBlock('ANGLE')
        ? generator.valueToCode(block, 'ANGLE', Order.NONE)
        : '0'
    const code = `servo.rotate_to_angle(${value_angle})\n`
    return code
}
pythonGenerator.forBlock['servo_rotate'] = function (block, generator) {
    const value_angle = block.getInputTargetBlock('ANGLE')
        ? generator.valueToCode(block, 'ANGLE', Order.NONE)
        : '0'
    //TODO: Check angle limits (and give wraparound warning)
    const code = `servo.rotate_by_angle(${value_angle})\n`
    return code
}
pythonGenerator.forBlock['servo_get_angle'] = function (block, generator) {
    const code = 'servo.angle'
    return [code, Order.ATOMIC]
}
pythonGenerator.forBlock['servo_angle'] = function (block, generator) {
    const angle = block.getFieldValue('ANGLE') || '0'
    return [angle, Order.ATOMIC]
}
