import { useState } from 'react'
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
    // Whether the press that's in flight landed on one of the card's own
    // controls rather than on the card itself — see `handlePointerDown`.
    const [pressOnControl, setPressOnControl] = useState(false)
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

    // `:active` applies to every ancestor, so a press on the ⋮ button or rename row
    // would sink the whole card. Marked here so `.card-no-press` can suppress it;
    // CSS can't do it alone without `:has()`, which is above the iOS 15 floor.
    const handlePointerDown = (e: React.PointerEvent) => {
        setPressOnControl(
            e.target instanceof Element &&
                e.target.closest('.card-control') !== null,
        )
    }

    return (
        <Card
            href={editorHref(id)}
            onPointerDown={handlePointerDown}
            // Capture phase, because children call stopPropagation and a bubble-phase
            // handler here would never cancel navigation while editing.
            onClickCapture={(e) => {
                if (isEditing) e.preventDefault()
            }}
            // `overflow-visible` so the settings dialog can escape the card;
            // that's why the thumbnail below has to round its own corners.
            className={`project-card card-interactive box-shadow overflow-visible bg-white w-62.5 border-transparent border-4 hover:border-blue ${pressOnControl ? 'card-no-press' : ''} ${isSelected ? '-translate-y-0.5! border-green! z-10' : ''}`}
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
