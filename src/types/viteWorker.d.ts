// astro/client doesn't pull in Vite's asset-import types, so `?worker` needs declaring.
declare module '*?worker' {
    const WorkerFactory: {
        new (options?: { name?: string }): Worker
    }
    export default WorkerFactory
}
