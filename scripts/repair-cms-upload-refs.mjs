#!/usr/bin/env node
/**
 * One-off repair for CMS upload refs orphaned when `media`/`files` were re-inserted with
 * fresh ObjectIds. Rematches by the timestamp an ObjectId encodes, tie-breaking on filename.
 *
 *   node scripts/repair-cms-upload-refs.mjs [--apply]
 *   env: CMS_URL (default http://localhost:3333), PAYLOAD_EMAIL, PAYLOAD_PASSWORD
 */

const CMS_URL = process.env.CMS_URL ?? 'http://localhost:3333'
const APPLY = process.argv.includes('--apply')

/** Seconds since epoch encoded in the leading four bytes of an ObjectId. */
function idTimestamp(id) {
    if (typeof id !== 'string' || !/^[0-9a-f]{24}$/i.test(id)) return null
    return parseInt(id.slice(0, 8), 16)
}

function createdSecond(doc) {
    return Math.floor(new Date(doc.createdAt).getTime() / 1000)
}

/** Lowercase alphanumerics, so "Lesson 4" matches "... Lesson 4-1.pdf". */
function normalise(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function getDocs(collection) {
    const response = await fetch(
        `${CMS_URL}/api/${collection}?pagination=false&depth=0`,
    )
    if (!response.ok) {
        throw new Error(`GET /api/${collection} -> ${response.status}`)
    }
    return (await response.json()).docs
}

/** second -> documents created in it, each list in stable id order. */
function groupByCreatedSecond(docs) {
    const groups = new Map()
    for (const doc of docs) {
        const second = createdSecond(doc)
        if (!groups.has(second)) groups.set(second, [])
        groups.get(second).push(doc)
    }
    for (const list of groups.values()) {
        list.sort((a, b) => a.id.localeCompare(b.id))
    }
    return groups
}

async function login() {
    const email = process.env.PAYLOAD_EMAIL
    const password = process.env.PAYLOAD_PASSWORD
    if (!email || !password) return null

    const response = await fetch(`${CMS_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
        throw new Error(`login failed: ${response.status}`)
    }
    return (await response.json()).token
}

async function main() {
    console.log(`CMS: ${CMS_URL}`)
    console.log(APPLY ? 'MODE: apply\n' : 'MODE: dry run (pass --apply to write)\n')

    const [content, media, files] = await Promise.all([
        getDocs('content'),
        getDocs('media'),
        getDocs('files'),
    ])

    const groups = { thumbnail: groupByCreatedSecond(media), File: groupByCreatedSecond(files) }

    const plan = []
    const problems = []

    for (const doc of content) {
        const update = {}
        const notes = []

        for (const field of ['thumbnail', 'File']) {
            const ref = doc[field]
            if (typeof ref !== 'string') continue

            const second = idTimestamp(ref)
            const candidates = groups[field].get(second) ?? []

            if (candidates.length === 0) {
                problems.push(`${doc.previewTitle}: no ${field} created at ${new Date(second * 1000).toISOString()}`)
                continue
            }

            let match = candidates[0]
            let how = ''

            if (candidates.length > 1) {
                const named = candidates.filter((candidate) =>
                    normalise(candidate.filename).includes(
                        normalise(doc.previewTitle),
                    ),
                )
                if (named.length !== 1) {
                    problems.push(
                        `${doc.previewTitle}: ${candidates.length} ${field}s share that second and ${named.length === 0 ? 'none' : 'several'} match the title — set it by hand (${candidates.map((c) => c.filename).join(', ')})`,
                    )
                    continue
                }
                match = named[0]
                how = ' (by filename; timestamp was ambiguous)'
            }

            update[field] = match.id
            notes.push(`${field} -> ${match.filename}${how}`)
        }

        if (Object.keys(update).length > 0) {
            plan.push({ doc, update, notes })
        }
    }

    for (const { doc, notes } of plan) {
        console.log(`• ${doc.previewTitle}`)
        for (const note of notes) console.log(`    ${note}`)
    }

    if (problems.length > 0) {
        console.log('\nUnresolved:')
        for (const problem of problems) console.log(`  ! ${problem}`)
    }

    console.log(`\n${plan.length} of ${content.length} content items would be updated.`)

    if (!APPLY) {
        console.log('Dry run — nothing written.')
        return
    }

    const token = await login()
    if (!token) {
        throw new Error('PAYLOAD_EMAIL and PAYLOAD_PASSWORD are required for --apply')
    }

    let updated = 0
    for (const { doc, update } of plan) {
        const response = await fetch(`${CMS_URL}/api/content/${doc.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `JWT ${token}`,
            },
            body: JSON.stringify(update),
        })
        if (!response.ok) {
            console.error(`  ! ${doc.previewTitle}: PATCH ${response.status}`)
            continue
        }
        updated++
    }
    console.log(`Updated ${updated} items.`)
}

main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
})
