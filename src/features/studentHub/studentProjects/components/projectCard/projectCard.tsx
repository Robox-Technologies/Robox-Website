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

    // The browser sets `:active` on every ancestor of the pressed node, so
    // pressing the ⋮ button, its menu or the rename row would sink the whole
    // card underneath a control that already gives its own press feedback.
    // Those presses are marked here so `.card-no-press` can suppress the sink;
    // CSS can't tell on its own without `:has()` (Safari 15.4, above the iOS 15
    // floor). Recomputed on every press, so it never needs clearing.
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
            // Guard in the capture phase: children (e.g. the rename input) call
            // stopPropagation, which would otherwise prevent a bubble-phase
            // onClick here from cancelling navigation while editing.
            onClickCapture={(e) => {
                if (isEditing) e.preventDefault()
            }}
            // `overflow-visible` so the settings dialog can escape the card;
            // that's why the thumbnail below has to round its own corners.
            className={`project-card card-interactive box-shadow overflow-visible bg-white w-62.5 border-transparent border-4 hover:border-blue ${pressOnControl ? 'card-no-press' : ''} ${isSelected ? '-translate-y-0.5! border-green! z-99' : ''}`}
            image={
                <img
                    src={project.thumbnail || ''}
                    // Decorative: the project name sits directly below it,
                    // and `thumbnail` is empty until the project is first saved.
                    alt=""
                    // The card rounds to 24px *outside* its 4px border, so the
                    // thumbnail sitting inside that border has to stop 4px
                    // short of it or its corners bulge past the highlight.
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
