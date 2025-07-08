


import { pythonGenerator, Order } from 'blockly/python'

pythonGenerator.forBlock['ultrasonic_distance'] = function () {
    const code = 'ultrasonic.distance()';
    return [code, Order.ATOMIC];
};
pythonGenerator.forBlock['sensor_bool'] = function (block) {
    const dropdown_sensor = block.getFieldValue('sensor');
    const colour_colour = block.getFieldValue('colour');

    const code = `${colour_colour === "#FFFFFF" ? "" : "not"} line.read_line_position()[${dropdown_sensor}] == 0`;
    return [code, Order.NONE];
}
pythonGenerator.forBlock['distance_bool'] = function(block, generator) {
    const dropdown_equality = block.getFieldValue('equality');
    // TODO: change Order.ATOMIC to the correct operator precedence strength
    const value_number = generator.valueToCode(block, 'number', Order.ATOMIC);
  
    // TODO: Assemble javascript into the code variable.
    const code = `ultrasonic.distance() ${dropdown_equality} ${value_number}`;
    // TODO: Change Order.NONE to the correct operator precedence strength
    return [code, Order.NONE];
}