import { extensionKeys } from "~types/projects";
import extensions from "../extensions.json" with { type: "json" };
const parsedExtensions = typeof extensions == "string" ? JSON.parse(extensions) : extensions;
export function addExtensions() {
    const extensionModal = document.getElementById("extension-modal") as HTMLDialogElement | null;
    if (!extensionModal) return;
    
    const extensionContainer = extensionModal.querySelector(".modal-content") as HTMLElement | null;
    if (!extensionContainer) return;
    for (const ext of extensionKeys) {
        const cardTemplate = document.getElementById(`extension-toggle-template`) as HTMLTemplateElement | null;
        const card = cardTemplate.content.firstElementChild.cloneNode(true) as HTMLElement | null;
        if (!card) return;

        const extensionInfo = parsedExtensions[ext];
        const { name, description, image } = extensionInfo;
        const nameElement = card.querySelector(".card-title") as HTMLElement | null;
        const descriptionElement = card.querySelector(".card-descriptions") as HTMLElement | null;
        const imgElement = card.querySelector(".card-image") as HTMLImageElement | null;
        if (!nameElement || !descriptionElement || !imgElement) return;

        card.querySelector(".card-title").textContent = name;
        card.querySelector(".card-descriptions").textContent = description;
        card.setAttribute("extension-type", ext.toString());
        imgElement.src = image;
        extensionContainer.appendChild(card);
    }
}