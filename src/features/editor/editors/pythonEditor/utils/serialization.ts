import {
    getProject,
    isValidProjectId,
    sanitizeImageDataUrl,
    editProject,
} from '@/utils/serialization'
import dayjs from 'dayjs'
import { codeToPng } from './screenshot'

export async function savePython(projectId: string, code: string) {
    if (!isValidProjectId(projectId)) throw new Error('Invalid project UUID')

    const project = await getProject(projectId)
    if (!project) throw new Error('Project not found')
    // Mirrors saveBlockly's guard; without it a stray python-editor tab could overwrite a block project.
    if (project.type !== 'python') return

    await editProject(projectId, {
        code,
        time: dayjs(),
        thumbnail: sanitizeImageDataUrl(await codeToPng(code)),
    })
}
