import { pythonGenerator, Order } from 'blockly/python'

pythonGenerator.forBlock['text_format'] = function (block, generator) {
    const template = block.getFieldValue('TEMPLATE') || ''
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '""'
    const escapedTemplate = template
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')

    return [`"${escapedTemplate}".format(${value})`, Order.ATOMIC]
}
