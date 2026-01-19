import { createUserSensor, getUserSensors } from "@root/blockly/serialization";
import sensors from "../sensors.json" with { type: "json" };
import { sensorKeys } from "~types/projects";
import type { UserSensorPins, Sensor, SensorSchema} from "~types/projects";
const parsedSensors: Record<Sensor, SensorSchema> = typeof sensors == "string" ? JSON.parse(sensors) : sensors;
export function setupManageSensors(uuid: string) {
    // createUserSensor(uuid, "Ultrasonic Sensor", "ULTRASONIC_SENSOR", {trigger: 7, echo: 8});
    const manageSensorsButton = document.getElementById("robox-manage-sensors") as HTMLButtonElement | null;
    if (manageSensorsButton) {
        manageSensorsButton.style.visibility = "visible";
        manageSensorsButton.addEventListener("click", () => {
            const sensorModal = document.getElementById("manage-sensors-modal") as HTMLDialogElement | null;
            if (!sensorModal) return;
            populateSensors(uuid);
            sensorModal.showModal();
        })
    }
    

}
function populateSensors(uuid: string) {
    const sensorCreateCardTemplate = document.querySelector("#sensor-card-create-template") as HTMLTemplateElement | null;
    const sensorContainer = document.querySelector("#manage-sensors-container") as HTMLElement | null;
    const sensorOptions = generateSelectOptions();
    if (!sensorCreateCardTemplate || !sensorContainer) return;
    // Wipe existing cards
    sensorContainer.innerHTML = "";
    // Add create card
    const sensorCreateCard = sensorCreateCardTemplate.content.firstElementChild.cloneNode(true) as HTMLElement | null;
    if (sensorCreateCard) {
        sensorContainer.appendChild(sensorCreateCard);
    }

    // Add existing sensors
    const userSensors = getUserSensors(uuid);
    const sensorCardTemplate = document.getElementById("sensor-card-template") as HTMLTemplateElement | null;
    if (!sensorCardTemplate) return;
    for (const userSensor of userSensors) {
        const sensorCard = sensorCardTemplate.content.firstElementChild.cloneNode(true) as HTMLElement | null;
        if (!sensorCard) return;
        const nameInput = sensorCard.querySelector(".sensor-name-input") as HTMLInputElement | null;
        const typeSelect = sensorCard.querySelector(".sensor-type-select") as HTMLSelectElement | null;
        if (!nameInput || !typeSelect) return;
        if (!userSensor.name || !userSensor.pins || !userSensor.type) return;
        for (const option of sensorOptions) {
            typeSelect.appendChild(option);
        }
        typeSelect.value = userSensor.type;
        nameInput.value = userSensor.name;
        const pinElements = generatePinElement(userSensor.type);
        populatePinElement(pinElements, userSensor.pins);
        sensorContainer.appendChild(sensorCard);
    }
}
function populatePinElement(pinElement: HTMLElement, userPins: UserSensorPins): void {
    const pinInputEl = pinElement.querySelector("input") as HTMLInputElement | null;
    if (!pinInputEl) return;
    const pinId = pinInputEl.id;
    if (userPins[pinId] !== undefined) {
        pinInputEl.value = userPins[pinId].toString();
    }
}
function generateSelectOptions(): HTMLOptionElement[] {
    const options: HTMLOptionElement[] = [];
    for (const sensorKey of sensorKeys) {
        const optionEl = document.createElement("option");
        optionEl.value = sensorKey;
        optionEl.textContent = parsedSensors[sensorKey as Sensor].name;
        options.push(optionEl);
    }
    return options;
}
function generatePinElement(sensorType: Sensor): HTMLElement {
    const sensor = parsedSensors[sensorType.toUpperCase()];
    const pinsContainer = document.createElement("div");
    pinsContainer.classList.add("sensor-pins");
    for (const [pinId, pin] of Object.entries(sensor.pins)) {
        const pinContainer = document.createElement("div");
        const pinNameEl = document.createElement("label");
        const pinInputEl = document.createElement("input");

        pinInputEl.id = pinId;
        pinInputEl.type = "number";
        pinInputEl.min = "0";
        pinInputEl.max = "40"
        pinInputEl.placeholder = "0-40";

        pinNameEl.htmlFor = pinId;
        pinNameEl.textContent = `${pin.name} Pin:`;
        
        
        pinContainer.appendChild(pinNameEl);
        pinContainer.appendChild(pinInputEl);
        pinsContainer.appendChild(pinContainer);

    }
    return pinsContainer;
}

// function validatePin(event: InputEvent,sensorType: SensorType, pinName: string, pinValue: number): void {

// }
