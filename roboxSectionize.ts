import { Plugin } from 'unified';
import { Root, RootContent, Parent } from 'mdast';

const plugin: Plugin<[], Root> = () => {
    return transform;
};

function transform(tree: Root): void {
    const children = tree.children;
    const newChildren: RootContent[] = [];
    let sectionCount = 0;
    let i = 0;

    while (i < children.length) {
        const start = children[i];
        const isHeading = start.type === 'heading';

        if (!isHeading || (start as any).depth < 2) {
            newChildren.push(start);
            i += 1;
            continue;
        }
        
        let endIndex = children.length - 1;
        let endIsImage = false;

        for (let j = i + 1; j < children.length; j++) {
            const next = children[j];

            if (isImageNode(next)) {
                endIndex = j;
                endIsImage = true;
                break;
            } else if (next.type === 'heading') {
                endIndex = j - 1;
                break;
            }
        }

        const textSlice = children.slice(i, endIsImage ? endIndex : endIndex + 1);

        const textDiv: Parent = {
            type: 'div',
            data: {
                hName: 'div',
                hProperties: {
                    className: 'text'
                }
            },
            children: textSlice
        };

        const sectionChildren: RootContent[] = [textDiv as RootContent];

        if (endIsImage) {
            const image = children[endIndex];
            if (image.type === 'html' && typeof image.value === 'string') {
                image.value = image.value.replace('<img', '<img class="media"');
            }
            sectionChildren.push(image);
        }

        const direction = !endIsImage || sectionCount % 2 === 0 ? 'LTR' : 'RTL';

        const section: Parent = {
            type: 'section',
            data: {
                hName: 'section',
                hProperties: {
                    className: `articleSection ${direction}${endIsImage ? ' equalWidth' : ''}`
                }
            },
            children: sectionChildren
        };

        newChildren.push(section as RootContent);
        sectionCount++;
        i = endIndex + 1;
    }

    tree.children = newChildren;
}

function isImageNode(node: RootContent): boolean {
    return (
        node.type === 'image' ||
        (node.type === 'html' && typeof node.value === 'string' && /<img\b/i.test(node.value))
    );
}

export default plugin;
