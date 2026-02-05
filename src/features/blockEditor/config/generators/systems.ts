import { pythonGenerator, Order } from 'blockly/python'
pythonGenerator.forBlock['wait_until'] = function (block, generator) {
    const value_name = generator.valueToCode(block, 'bool', Order.ATOMIC);
    const code = `while not ${value_name}:
        time.sleep(0.01)\n`;
    return code;
};
pythonGenerator.forBlock['get_led_state'] = function () {
    const code = 'ENV_LED.value()';
    return [code, Order.ATOMIC];
};
pythonGenerator.forBlock['get_time'] = function () {
    const code = 'time.time()';
    return [code, Order.ATOMIC];
};
pythonGenerator.forBlock['led_bool'] = function (block) {
    const value_led_on = block.getFieldValue('state');
    const code = `ENV_LED.value(${value_led_on})\n`;
    return code;
};
pythonGenerator.forBlock['led_toggle'] = function () {
    const code = 'ENV_LED.toggle()\n';
    return code;
};
pythonGenerator.forBlock['sleep'] = function (block, generator) {
    const value_time = generator.valueToCode(block, 'time', Order.ATOMIC);
    const code = `time.sleep(${value_time})\n`;
    return code;
};
pythonGenerator.forBlock['print'] = function (block, generator) {
    const value_time = generator.valueToCode(block, 'string', Order.ATOMIC);
    const code = `print(generatePrint("console", ${value_time}))\n`;
    return code;
};