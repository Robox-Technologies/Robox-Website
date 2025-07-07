import { Eta, EtaFileResolutionError, Options } from 'eta';
import { unified } from 'unified';
import { Node } from 'unist';
import { visit } from 'unist-util-visit';
import rehypeDocument from 'rehype-document';
import rehypeFormat from 'rehype-format';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import roboxSectionize from "./roboxSectionize.js"; // <-- .ts import
import path from 'path';
import fs from "fs";

const storeProcessor = unified()
    .use(roboxSectionize)
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeFormat)
    .use(rehypeStringify);
const __dirname = path.resolve();

const aliases = {
        '@images': path.join(__dirname, 'src/images/'),
        '@partials': path.join(__dirname, 'templates/partials/'),
        '@root': path.join(__dirname, 'src/root/'),
    };
interface ResolveOptions extends Partial<Options> {
    filename?: string;
}

export class RoboxProcessor extends Eta {
    // Override readFile to process .md files
    readFile = (filename: string): string => {
        if (filename.endsWith('.md')) {
            const content = fs.readFileSync(filename, 'utf-8');
            const processed = storeProcessor.processSync(content);
            return processed.toString();
        }
        return fs.readFileSync(filename, 'utf-8');
    }
}