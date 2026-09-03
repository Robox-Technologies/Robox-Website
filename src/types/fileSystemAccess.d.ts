/**
 * The File System Access API entry points, which lib.dom.d.ts doesn't declare.
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
