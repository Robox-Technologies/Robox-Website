import type { Plugin } from 'unified'
import type { Root, RootContent, Parent } from 'mdast'

const plugin: Plugin<[], Root> = () => {
    return transform
}

function transform(tree: Root): void {
    const children = tree.children
    const newChildren: RootContent[] = []
    let sectionCount = 0
    let i = 0

    while (i < children.length) {
        const start = children[i]
        const isHeading = start.type === 'heading'

        if (!isHeading || start.depth < 2) {
            newChildren.push(start)
            i += 1
            continue
        }

        let endIndex = children.length - 1
        let endIsImage = false

        for (let j = i + 1; j < children.length; j++) {
            const next = children[j]

            if (isImageNode(next)) {
                endIndex = j
                endIsImage = true
                break
            } else if (next.type === 'heading') {
                endIndex = j - 1
                break
            }
        }

        const textSlice = children.slice(
            i,
            endIsImage ? endIndex : endIndex + 1,
        )

        const textDiv: Parent = {
            type: 'div',
            data: {
                hName: 'div',
                hProperties: {
                    className: ['text'],
                },
            },
            children: textSlice,
        }

        const sectionChildren: RootContent[] = [textDiv as RootContent]

        if (endIsImage) {
            const image = children[endIndex]
            markAsMedia(image)
            sectionChildren.push(image)
        }

        const direction = !endIsImage || sectionCount % 2 === 0 ? 'LTR' : 'RTL'

        const section: Parent = {
            type: 'section',
            data: {
                hName: 'section',
                hProperties: {
                    className: [
                        'articleSection',
                        direction,
                        ...(endIsImage ? ['equalWidth'] : []),
                    ],
                },
            },
            children: sectionChildren,
        }

        newChildren.push(section as RootContent)
        sectionCount++
        i = endIndex + 1
    }

    tree.children = newChildren
}

/**
 * Tags the section's image so the stylesheet can size it. Markdown gives us a
 * raw `<img>`, while MDX gives us an `<Image>` JSX element whose `class`
 * attribute is forwarded to the rendered `<img>`.
 */
function markAsMedia(node: RootContent): void {
    if (node.type === 'html' && typeof node.value === 'string') {
        node.value = node.value.replace('<img', '<img class="media"')
        return
    }

    if (!('attributes' in node) || !Array.isArray(node.attributes)) {
        return
    }

    const classAttribute = node.attributes.find(
        (attribute) =>
            attribute.type === 'mdxJsxAttribute' &&
            (attribute.name === 'class' || attribute.name === 'className'),
    )

    if (!classAttribute) {
        node.attributes.push({
            type: 'mdxJsxAttribute',
            name: 'class',
            value: 'media',
        })
    } else if (typeof classAttribute.value === 'string') {
        classAttribute.value = `${classAttribute.value} media`
    }
}

function isImageNode(node: RootContent): boolean {
    return (
        node.type === 'image' ||
        (node.type === 'html' &&
            typeof node.value === 'string' &&
            /<img\b/i.test(node.value)) ||
        ('name' in node && node.name === 'Image')
    )
}

export default plugin
