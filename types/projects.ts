import dayjs from "dayjs"
export enum ExtensionType {
    SERVO = "SERVO",
    ADVANCED = "ADVANCED",
    DISPLAY = "DISPLAY",
}
export type Extension = {
    [key in ExtensionType]: boolean
}
export type Project = {
    name: string
    time: dayjs.Dayjs
    workspace: {[key: string]: unknown} | false
    thumbnail: string
    extensions: Extension
}
export type Projects = {[uuid: string]: Project} 