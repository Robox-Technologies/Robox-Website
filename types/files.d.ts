declare module '*.svg' {
    const value: string;
    export default value;
}
declare module '*.svg?raw' {
    const content: string;
    export default content;
}
declare module '*.svg?inline=base64' {
    const content: string;
    export default content;
}
declare module '*.png' {
    const content: string;
    export default content;
}