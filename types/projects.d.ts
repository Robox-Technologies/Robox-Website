import { Workspace } from "blockly"
import dayjs from "dayjs"
export type Project = {
    name: string
    time: dayjs.Dayjs
    workspace: {[key: string]: any} | false
    thumbnail: string
}
export type Projects = {[uuid: string]: Project} 