export function setupManageSensors() {
    const manageSensorsButton = document.getElementById("robox-manage-sensors") as HTMLButtonElement | null;
    if (manageSensorsButton) {
        manageSensorsButton.style.visibility = "visible";
        manageSensorsButton.addEventListener("click", () => {
            const sensorModal = document.getElementById("extra-sensors-modal") as HTMLDialogElement | null;
            if (!sensorModal) return;
            sensorModal.showModal();
        })
    }
}