import { createUserSensor, getUserSensors, editUserSensor } from "@root/blockly/serialization";
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
    const createSensorsButton = document.getElementById("manage-sensors-create-button") as HTMLButtonElement | null;
    if (createSensorsButton) {
        createSensorsButton.addEventListener("click", () => {
            const createCard = document.querySelector("div.create-sensor-card") as HTMLDivElement | null;
            if (!createCard) return;
            if (createCard.style.display === "none") {
                createCard.style.display = "block";
                createSensorsButton.textContent = "Submit";
            } else {
                createCard.style.display = "none";
                createSensorsButton.textContent = "Create Sensor";
            }
        });
    }

}
function generateCreateCard(uuid: string): HTMLElement | null {
    const sensorCreateCardTemplate = document.querySelector("#sensor-card-create-template") as HTMLTemplateElement | null;
    if (!sensorCreateCardTemplate) return null;
    const sensorCreateCard = sensorCreateCardTemplate.content.firstElementChild.cloneNode(true) as HTMLElement | null;
    const createForm = sensorCreateCard.querySelector("form") as HTMLFormElement | null;
    const createSelect = sensorCreateCard.querySelector("select") as HTMLSelectElement | null;
    if (!sensorCreateCard || !createForm || !createSelect) return null;
    createForm.id = "create-sensor-form";
    createForm.addEventListener("submit", (event) => {
        createSensor(event, uuid);
    });
    generateSelectOptions(createSelect);
    createSelect.addEventListener("change", switchSensorPins);
    return sensorCreateCard;
}
function populateSensors(uuid: string) {
    const sensorCreateCardTemplate = document.querySelector("#sensor-card-create-template") as HTMLTemplateElement | null;
    const sensorContainer = document.querySelector("#manage-sensors-container") as HTMLElement | null;

    if (!sensorCreateCardTemplate || !sensorContainer) return;
    // Wipe existing cards
    sensorContainer.innerHTML = "";
    // Add create card
    const sensorCreateCard = generateCreateCard(uuid);
    if (sensorCreateCard) {
        sensorContainer.appendChild(sensorCreateCard);
    }

    // Add existing sensors
    const userSensors = getUserSensors(uuid);
    const sensorCardTemplate = document.getElementById("sensor-card-template") as HTMLTemplateElement | null;
    if (!sensorCardTemplate) return;
    for (let index = 0; index < userSensors.length; index++) {
        const userSensor = userSensors[index];
        const sensorCard = sensorCardTemplate.content.firstElementChild.cloneNode(true) as HTMLElement | null;
        if (!sensorCard) return;
        const sensorForm = sensorCard.querySelector("form") as HTMLFormElement | null;
        const nameInput = sensorCard.querySelector(".sensor-name-input") as HTMLInputElement | null;
        const typeSelect = sensorCard.querySelector(".sensor-type-select") as HTMLSelectElement | null;
        if (!nameInput || !typeSelect || !sensorForm) return;
        if (!userSensor.name || !userSensor.pins || !userSensor.type) return;

        sensorForm.id = `sensor-form-${index}`;
        generateSelectOptions(typeSelect);
        typeSelect.value = userSensor.type;
        nameInput.value = userSensor.name;

        const pinElements = generatePinElement(userSensor.type);
        populatePinElements(pinElements, userSensor.pins);
        sensorForm.appendChild(pinElements);
        sensorContainer.appendChild(sensorCard);

        //Register event listeners
        const editButton = sensorCard.querySelector(".edit-sensor-button") as HTMLButtonElement | null;
        if (editButton) {
            editButton.addEventListener("click", toggleEditing);
        }
        // Handle create and edit form submissions
        sensorForm.addEventListener("submit", (event) => {
            editSensor(event, uuid, index);
        });
        // Remove the old pins and add new ones when the sensor type is changed
        typeSelect.addEventListener("change", switchSensorPins);
    }
}
function switchSensorPins(event: Event): void {
    const selectElement = event.currentTarget as HTMLSelectElement | null;
    if (!selectElement) return;
    const sensorCard = selectElement.closest(".card") as HTMLElement | null;
    if (!sensorCard) return;
    const sensorForm = sensorCard.querySelector("form") as HTMLFormElement | null;
    if (!sensorForm) return;
    const existingPinsElement = sensorForm.querySelector(".sensor-pins") as HTMLElement | null;
    if (existingPinsElement) {
        existingPinsElement.remove();
    }
    const sensorType = selectElement.value as Sensor;
    const newPinsElement = generatePinElement(sensorType);
    sensorForm.appendChild(newPinsElement);
}

function createSensor(event: SubmitEvent, uuid: string): void {
    const form = event.currentTarget as HTMLFormElement | null;
    if (!form) return;
    const nameInput = form.querySelector(".sensor-name-input") as HTMLInputElement | null;
    const typeSelect = form.querySelector(".sensor-type-select") as HTMLSelectElement | null;
    if (!nameInput || !typeSelect) return;
    const sensorName = nameInput.value;
    const sensorType = typeSelect.value as Sensor;
    const pins = generateUserPinsFromForm(form, sensorType);
    if (!pins) return;
    // Validate that the pins are the available pins in parsedSensors

    event.preventDefault();
    createUserSensor(uuid, sensorName, sensorType, pins);
    populateSensors(uuid);

}
function generateUserPinsFromForm(form: HTMLFormElement, sensorType: Sensor): {[key: string]: number} | null {
    const pinInputs: NodeListOf<HTMLInputElement> = form.querySelectorAll(".sensor-pins input");
    const pins: {[key: string]: number} = {};
    let invalidPinFound = false;
    pinInputs.forEach((pinInput) => {
        pinInput.setCustomValidity("");
        const inputEl = pinInput as HTMLInputElement;
        const pinId = inputEl.id;
        const pinValue = parseInt(inputEl.value);
        if (isNaN(pinValue)) return null;
        const parsedSensor = parsedSensors[sensorType];
        const pinSchema = parsedSensor.pins[pinId];
        if (!pinSchema) return null;
        if (!pinSchema.available_pins.includes(pinValue)) {
            pinInput.setCustomValidity("Invalid pin for selected sensor type");
            invalidPinFound = true;
        }
        pins[pinId] = pinValue;
    });
    if (invalidPinFound) {
        form.reportValidity();
        return null;
    }
    return pins;
}
function editSensor(event: SubmitEvent, uuid: string, sensorIndex: number): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement | null;
    if (!form) return;
    const card = form.closest(".sensor-card") as HTMLElement | null;
    const nameInput = form.querySelector(".sensor-name-input") as HTMLInputElement | null;
    const typeSelect = form.querySelector(".sensor-type-select") as HTMLSelectElement | null;
    if (!nameInput || !typeSelect || !card) return;
    const sensorName = nameInput.value;
    const sensorType = typeSelect.value as Sensor;
    const pins = generateUserPinsFromForm(form, sensorType);
    if (!pins) return;
    editUserSensor(uuid, sensorIndex, sensorName, sensorType, pins);
    card.removeAttribute("editing");
}
function toggleEditing(event: MouseEvent): void {
    const button = event.currentTarget as HTMLButtonElement | null;
    if (!button) return;

    const sensorCard = button.closest(".sensor-card") as HTMLElement | null;
    if (!sensorCard) return;

    const sensorForm = sensorCard.querySelector("form") as HTMLFormElement | null;
    if (!sensorForm) return;

    if (!sensorCard.hasAttribute("editing")) {
        event.preventDefault();
        sensorCard.setAttribute("editing", "");
        return;
    }
    sensorForm.requestSubmit();
}

function populatePinElements(pinElement: HTMLElement, userPins: UserSensorPins): void {
    const pinInputEls = pinElement.querySelectorAll("input") as NodeListOf<HTMLInputElement>;
    if (!pinInputEls) return;
    pinInputEls.forEach(pinInputEl => {
        const pinId = pinInputEl.id;
        if (userPins[pinId] !== undefined) {
            pinInputEl.value = userPins[pinId].toString();
        }
    });
}
function generateSelectOptions(select: HTMLSelectElement): HTMLOptionElement[] {

    for (const sensorKey of sensorKeys) {
        const optionEl = document.createElement("option");
        optionEl.value = sensorKey;
        optionEl.textContent = parsedSensors[sensorKey as Sensor].name;
        select.appendChild(optionEl);
    }
    return 
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
        pinInputEl.required = true;

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
