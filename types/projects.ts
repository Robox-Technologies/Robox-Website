import dayjs from "dayjs"
const enum ExtensionType {
    SERVO,
    ADVANCED,
    DISPLAY,
}
type Extension = {
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