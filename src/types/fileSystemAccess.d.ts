/**
 * The File System Access API (`showDirectoryPicker`, `showOpenFilePicker`,
 * `showSaveFilePicker`) is Chrome/Edge-only and isn't part of the standard
 * DOM types TypeScript ships — `FileSystemDirectoryHandle` and friends are
 * declared in lib.dom.d.ts, but these entry points aren't.
 *
 * https://developer.mozilla.org/docs/Web/API/Window/showDirectoryPicker
 */
interface DirectoryPickerOptions {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?:
        | FileSystemHandle
        | 'desktop'
        | 'documents'
        | 'downloads'
        | 'music'
        | 'pictures'
        | 'videos'
}

declare function showDirectoryPicker(
    options?: DirectoryPickerOptions,
): Promise<FileSystemDirectoryHandle>
