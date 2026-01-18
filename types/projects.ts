import dayjs from "dayjs"
import extensions from "../src/pages/editor/extensions.json" with { type: "json" };

const parsedExtensions = typeof extensions == "string" ? JSON.parse(extensions) : extensions;

export type Extension = Extract<keyof typeof parsedExtensions, string>

function keysOf<T extends object>(obj: T): Extract<keyof T, string>[] {
    return Object.keys(obj) as Extract<keyof T, string>[]
}

export const extensionKeys = keysOf(parsedExtensions)
export type UserExtensions = {
    [key in Extension]?: boolean
}
export type Project = {
    name: string
    time: dayjs.Dayjs
    workspace: {[key: string]: unknown} | false
    thumbnail: string
    extensions: UserExtensions
}

export type Projects = {[uuid: string]: Project}