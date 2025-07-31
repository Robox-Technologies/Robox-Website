import dayjs from "dayjs"
export type Project = {
    name: string
    time: dayjs.Dayjs
    workspace: {[key: string]: unknown} | false
    thumbnail: string
}
export type Projects = {[uuid: string]: Project} 