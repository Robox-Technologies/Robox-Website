import Card from '@components/card'
import { faSquareBinary } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ProjectSettings from './projectSettings'
import { useStore } from '@nanostores/react'
import { openProject } from '../../stores/projectSettingsModal'
import SettingDialog from './settingDialog'
import { getProject } from '@utils/serialization'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
export function ProjectCard({ id }: { id: string }) {
    const $selectedProject = useStore(openProject)
    const project = getProject(id)
    if (!project) return null
    const isSelected = $selectedProject === id
    return (
        <a href={`./editor/index.html?id=${id}`}>
            <Card
                className={`project-card overflow-visible relative bg-white w-[250px] border-transparent border-4 transition-transform hover:-translate-y-0.5 hover:border-blue duration-100 hover:cursor-pointer ${isSelected ? '-translate-y-0.5! border-green! z-99' : ''}`}
                image={
                    <img
                        src={project.thumbnail || ''}
                        alt="Project Image"
                        className="w-full object-cover bg-tone3 aspect-video"
                    />
                }
                title={
                    <>
                        <div className="flex flex-row justify-center items-center gap-2">
                            <FontAwesomeIcon
                                className="h-6 w-5 text-blue -transform-y-1"
                                icon={faSquareBinary}
                            />
                            <h3 className="text-xl font-bold">
                                {project.name || 'Untitled'}
                            </h3>
                        </div>
                        <ProjectSettings id={id} />
                    </>
                }
                description={
                    <p className="text-gray-700">
                        {dayjs(project.time).fromNow()}
                    </p>
                }
                absolute={isSelected ? <SettingDialog /> : null}
            />
        </a>
    )
}
