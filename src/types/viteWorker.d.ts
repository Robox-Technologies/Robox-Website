// Vite's built-in `?worker` import suffix (used to bundle monaco-editor's
// worker) isn't covered by astro/client's types, which only pull in Vite's
// import-meta types, not the full asset-import ambient module set.
declare module '*?worker' {
    const WorkerFactory: {
        new (options?: { name?: string }): Worker
    }
    export default WorkerFactory
}
