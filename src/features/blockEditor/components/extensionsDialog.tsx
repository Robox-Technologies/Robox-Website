import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@components/dialog";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ExtensionKey, ExtensionTags } from "src/types/extensions";
import extensions from "@data/extensions.json";
import { Toggle } from "@components/toggle";
import { useState } from "react";


export default function ExtensionsDialog() {
    const extensionKeys = Object.keys(extensions) as (keyof typeof extensions)[]
    return (
        <Dialog id="extensionsDialog" className="h-175">
            <DialogHeader>
                <div className="flex items-center text-xl font-bold">
                    <FontAwesomeIcon icon={faPuzzlePiece} className="text-green mr-2 mb-0.5" />
                    <h2>Extensions</h2>
                </div>
            </DialogHeader>
            <DialogBody className="flex flex-col items-center justify-start p-4 gap-4">
                {extensionKeys.map((extension) => (
                    <ExtensionCard key={extension} extension={extension} />
                ))}
            </DialogBody>

            <DialogFooter>

            </DialogFooter>
        </Dialog>
    );
}

function ExtensionCard({extension}: {extension: ExtensionKey}) {
    const [enabled, setEnabled] = useState(false);
    const extensionData = extensions[extension]
    return (
        <div className="border border-gray-300 rounded-lg p-4 w-full hover:bg-gray-100 transition">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg text-gray-800 font-semibold">{extensionData.emoji} {extensionData.name}</h3>
                    <ExtensionTag tag={extensionData.tag as ExtensionTags} />
                </div>
                <Toggle enabled={enabled} onToggle={() => {
                    setEnabled(!enabled)
                }} />
            </div>
            <p className="text-gray-500 text-sm">{extensionData.description}</p>
            
        </div>
    )
}
function ExtensionTag({tag}: {tag: ExtensionTags}) {
    const colors: Record<ExtensionTags, string> = {
        "software": "bg-blue-100 text-blue-500",
        "hardware": "bg-green-100 text-green-500",
        "customization": "bg-purple-100 text-purple-500"
    }
    return (
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${colors[tag]}`}>
            {tag}
        </span>
    )
}