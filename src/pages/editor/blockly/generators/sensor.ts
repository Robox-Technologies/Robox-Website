


import { pythonGenerator, Order } from 'blockly/python'


const hexToName: Record<
    "#ff0000" | "#ffa500" | "#ffff00" | "#008000" | "#0000ff" | "#800080" | "#000000" | "#ffffff",
    string
> = {
    "#ff0000": "red",
    "#ffa500": "orange",
    "#ffff00": "yellow",
    "#008000": "green",
    "#0000ff": "blue",
    "#800080": "purple",
    "#000000": "black",
    "#ffffff": "white"
};
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

    const value_number = generator.valueToCode(block, 'number', Order.ATOMIC);
  
    const code = `ultrasonic.distance() ${dropdown_equality} ${value_number}`;
    return [code, Order.NONE];

}
pythonGenerator.forBlock['color_sensor_calibrate'] = function (block, generator) {
    const code = 'color_sensor.calibrate()\n';
    return code;
};


pythonGenerator.forBlock['color_sensor_is_colour'] = function (block, generator) {
    const hex = block.getFieldValue('colour').toLowerCase();

    if (!isStandardHex(hex)) {
        throw new Error(`Unrecognized hex colour: ${hex}`);
    }

    const colourName = hexToName[hex];
    const code = `color_sensor.closest_colour_name() == '${colourName}'`;
    return [code, Order.NONE];
};
pythonGenerator.forBlock['color_sensor_value'] = function (block, generator) {
    const code = 'color_sensor.closest_colour_name()';
    return [code, Order.ATOMIC];
};
function isStandardHex(hex: string): hex is keyof typeof hexToName {
    return hex in hexToName;
}