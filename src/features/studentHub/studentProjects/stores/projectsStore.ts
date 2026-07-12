import { atom } from 'nanostores'
import type { UserProject } from 'src/types/projects'
import { getProjects } from '@/utils/serialization'

// Holds the loaded projects so cards can read them synchronously while the
// underlying (async) SQLite storage is fetched once and refreshed on mutation.
export const projectsStore = atom<Record<string, UserProject>>({})

export async function reloadProjects(): Promise<void> {
    projectsStore.set(await getProjects())
}
