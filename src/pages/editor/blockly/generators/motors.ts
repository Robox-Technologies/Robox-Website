import { pythonGenerator, Order } from 'blockly/python';

pythonGenerator.forBlock['motor_stop'] = function() {
    return 'motors.stop()\n';
};

pythonGenerator.forBlock['motor_reverse'] = function() {
    return 'left_motor_polarity *= -1\nright_motor_polarity *= -1\n';
};

pythonGenerator.forBlock['motor_move_simple'] = function(block) {
    const direction = block.getFieldValue('direction');
    const multiplier = (direction === 'forward') ? 1 : -1;
    return `motors.run_motors(${multiplier} * motor_speed * left_motor_polarity, ${multiplier} * motor_speed * right_motor_polarity)\n`;
};

pythonGenerator.forBlock['motor_turn_simple'] = function(block) {
    const direction = block.getFieldValue('direction');
    const leftDir = (direction === 'right') ? 1 : -1;
    const rightDir = (direction === 'left') ? -1 : -1;
    return `motors.run_motors(${leftDir} * motor_speed * left_motor_polarity, ${rightDir} * motor_speed * right_motor_polarity)\n`;
};

pythonGenerator.forBlock['motor_set_speed'] = function(block, generator) {
    const speed = generator.valueToCode(block, 'speed', Order.ATOMIC) || '0';
    return `motor_speed = ${speed}\n`;
};
pythonGenerator.forBlock['motor_dual_speed'] = function(block, generator) {
  const left = generator.valueToCode(block, 'left_speed', Order.ATOMIC) || '0';
  const right = generator.valueToCode(block, 'right_speed', Order.ATOMIC) || '0';
  return `motors.run_motors(${left} * left_motor_polarity, ${right} * right_motor_polarity)\n`;
};

pythonGenerator.forBlock['motor_dual_speed_duration'] = function(block, generator) {
  const left = generator.valueToCode(block, 'left_speed', Order.ATOMIC) || '0';
  const right = generator.valueToCode(block, 'right_speed', Order.ATOMIC) || '0';
  const duration = generator.valueToCode(block, 'duration', Order.ATOMIC) || '0';
  return `motors.run_motors(${left} * left_motor_polarity, ${right} * right_motor_polarity)\ntime.sleep(${duration})\nmotors.stop()\n`;
};
