import Card from '@/components/card'
import { faSquareBinary } from '@fortawesome/free-solid-svg-icons'
import { faPython } from '@fortawesome/free-brands-svg-icons'
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
    const typeIcon = project.type === 'python' ? faPython : faSquareBinary

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
        <Card
            href={editorHref(id)}
            // Capture phase, because children call stopPropagation and a bubble-phase
            // handler here would never cancel navigation while editing.
            onClickCapture={(e) => {
                if (isEditing) e.preventDefault()
            }}
            // `overflow-visible` so the settings dialog can escape the card;
            // that's why the thumbnail below has to round its own corners.
            className={`project-card card-interactive card-no-press box-shadow overflow-visible bg-white w-62.5 border-transparent border-4 hover:border-blue ${isSelected ? 'project-card-selected border-green! z-10' : ''}`}
            image={
                <img
                    src={project.thumbnail || ''}
                    // Decorative: the project name sits directly below it,
                    // and `thumbnail` is empty until the project is first saved.
                    alt=""
                    // 4px short of the card's 24px radius, which is measured outside its border.
                    className="w-full rounded-t-[calc(1.5rem-4px)] object-cover bg-tone3 aspect-video"
                />
            }
            title={
                <div className="flex h-8 w-full min-w-0 flex-row items-center gap-2">
                    {isEditing ? (
                        <ProjectEditInput
                            initialName={project.name}
                            onSave={handleSaveName}
                            onCancel={handleCancelEdit}
                        />
                    ) : (
                        <div className="flex min-w-0 flex-1 flex-row items-center gap-2">
                            <FontAwesomeIcon
                                className="shrink-0 text-blue"
                                size="lg"
                                icon={typeIcon}
                            />
                            <h3 className="truncate whitespace-nowrap text-xl font-bold">
                                {project.name || 'Untitled'}
                            </h3>
                        </div>
                    )}
                    {!isEditing && <ProjectSettings id={id} />}
                </div>
            }
            description={
                <p className="text-gray-700">{dayjs(project.time).fromNow()}</p>
            }
            absolute={isSelected && !isEditing ? <SettingDialog /> : null}
        />
    )
}
