import * as Blockly from "blockly";
import { getProject } from "@root/blockly/serialization";
const urlParams = new URLSearchParams(window.location.search);
Blockly.Extensions.register('sensor_menu_extension', function() {

    const sensorField = this.getField('sensor');
    if (sensorField instanceof Blockly.FieldDropdown) {
        sensorField.setOptions(generateSensorOptions);
    }
});
function generateSensorOptions() {
    const projectId = urlParams.get('id')
    const project = getProject(projectId)
    const extensions = project ? project.extensions : null
    let sensorOptions: [string, string][] = []
    if (extensions && extensions.EXTRA_SENSORS) {
        const sensors = project.sensors || []
        sensorOptions = sensors.map((sensor, index) => [sensor.name, index.toString()])
        
    }
    sensorOptions.unshift(["main", "-1"])
    return sensorOptions;
}