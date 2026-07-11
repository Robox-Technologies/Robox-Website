import Card from '@/components/card'
import { faSquareBinary } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ProjectSettings from './projectSettings'
import { useStore } from '@nanostores/react'
import { openProject, editingProject } from '../../stores/projectSettingsModal'
import SettingDialog from './settingDialog'
import ProjectEditInput from './projectEditInput'
import { getProject, editProject } from '@/utils/serialization'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
export function ProjectCard({ id }: { id: string }) {
    const $selectedProject = useStore(openProject)
    const $editingProject = useStore(editingProject)
    const project = getProject(id)
    if (!project) return null
    const isSelected = $selectedProject === id
    const isEditing = $editingProject === id

    const handleSaveName = (newName: string) => {
        if (newName.trim()) {
            const success = editProject(id, { ...project, name: newName.trim() })
            if (success) {
                editingProject.set(null)
            }
        }
    }

    const handleCancelEdit = () => {
        editingProject.set(null)
    }
    return (
        <a href={`./editor/index.html?id=${id}`} onClick={(e) => isEditing && e.preventDefault()}>
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
