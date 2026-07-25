import Card from '@/components/card'
import { faSquareBinary } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ProjectSettings from './projectSettings'
import { useStore } from '@nanostores/react'
import { openProject, editingProject } from '../../stores/projectSettingsModal'
import SettingDialog from './settingDialog'
import ProjectEditInput from './projectEditInput'
import { editProject } from '@/utils/serialization'
import { reloadProjects } from '../../stores/projectsStore'
import type { UserProject } from 'src/types/projects'
import { editorHref } from '../../utils/editorHref'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
export function ProjectCard({
    id,
    project,
}: {
    id: string
    project: UserProject
}) {
    const $selectedProject = useStore(openProject)
    const $editingProject = useStore(editingProject)
    if (!project) return null
    const isSelected = $selectedProject === id
    const isEditing = $editingProject === id

    const handleSaveName = async (newName: string) => {
        if (newName.trim()) {
            const success = await editProject(id, { name: newName.trim() })
            if (success) {
                editingProject.set(null)
                // Also clear the selection so the settings menu (shown while
                // openProject === id) doesn't pop back up when editing ends.
                openProject.set(null)
                await reloadProjects()
            }
        }
    }

    const handleCancelEdit = () => {
        editingProject.set(null)
        openProject.set(null)
    }
    return (
        // Guard in the capture phase: children (e.g. the rename input) call
        // stopPropagation, which would otherwise prevent a bubble-phase onClick
        // here from cancelling navigation while editing.
        <a
            href={editorHref(id)}
            onClickCapture={(e) => {
                if (isEditing) e.preventDefault()
            }}
        >
            <Card
                className={`project-card overflow-visible relative bg-white w-62.5 border-transparent border-4 transition-transform hover:-translate-y-0.5 hover:border-blue duration-100 hover:cursor-pointer ${isSelected ? '-translate-y-0.5! border-green! z-99' : ''}`}
                image={
                    <img
                        src={project.thumbnail || ''}
                        alt="Project Image"
                        className="w-full object-cover bg-tone3 aspect-video"
                    />
                }
                title={
                    <>
                        <div className="flex w-full flex-row items-center gap-2">
                            {isEditing ? (
                                <ProjectEditInput
                                    initialName={project.name}
                                    onSave={handleSaveName}
                                    onCancel={handleCancelEdit}
                                />
                            ) : (
                                <div className="flex min-w-0 flex-1 flex-row items-center gap-2">
                                    <FontAwesomeIcon
                                        className="h-6 w-5 text-blue -transform-y-1"
                                        icon={faSquareBinary}
                                    />
                                    <h3 className="truncate whitespace-nowrap text-xl font-bold">
                                        {project.name || 'Untitled'}
                                    </h3>
                                </div>
                            )}
                            {!isEditing && <ProjectSettings id={id} />}
                        </div>
                    </>
                }
                description={
                    <p className="text-gray-700">
                        {dayjs(project.time).fromNow()}
                    </p>
                }
                absolute={isSelected && !isEditing ? <SettingDialog /> : null}
            />
        </a>
    )
}
