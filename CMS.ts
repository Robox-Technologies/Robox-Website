import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'


//TODO: Make this function actually typecheck instead of using my bad types
const CMS_URL = process.env.CMS_URL
export type ArticleLocation = 'Newsletter' | 'Teacher Resources' | 'Student Resources';
type ContentArticle = {
    id: string;
    type: 'article';
    createdAt: string;
    updatedAt: string;
    thumbnail: { id: string, url: string; };
    previewTitle: string;
    articleTitle: string;
    description: string;
    slug: string;
    author: string;
    tags?: string[];
    content?: object[];
    callToAction?: string;
    status: string;
    location: string;
    favorite: boolean;
};

type ContentResource = {
    id: string;
    type: 'resource';
    createdAt: string;
    callToAction?: string;
    updatedAt: string;
    thumbnail: { id: string, url: string; };
    previewTitle: string;
    description: string;
    File: { id: string; url: string; filename: string; };
    status: string;
    location: string;
    favorite: boolean;
};
type CMSRedirect = {
    slug: string;
    destination: {
        url: string;
    };
}
type ContentItem = ContentArticle | ContentResource;


async function getCMSCollection(collectionName: string): Promise<ContentItem[] | null> {
    try {
        const response = await fetch(`${CMS_URL}/api/${collectionName}?pagination=false`);
        if (!response.ok) {
            console.warn(`Failed to fetch collection ${collectionName}: ${response.statusText}`);
            return null;
        }
        const collection = (await response.json())["docs"].filter((item: ContentItem) => {
            return item.status === "published";
        });
        return collection;
    } catch (error) {
        console.error(`Error fetching collection ${collectionName}:`, error);
        return null;
    }

}
export async function getCMSRedirects(): Promise<CMSRedirect[] | null> {
    try {
        const response = await fetch(`${CMS_URL}/api/redirects?pagination=false`);
        if (!response.ok) {
            console.warn(`Failed to fetch redirects: ${response.statusText}`);
            return null;
        }
        const redirects = (await response.json())["docs"];
        return redirects;
    } catch (error) {
        console.error(`Error fetching redirects:`, error);
        return null;
    }
}
export async function getCMSResources(): Promise<(ContentItem)[]> {
    const content = await getCMSCollection('content');
    if (!content) return [];
    const publishedContent = content.filter((item: ContentItem) => item.status === 'published');
    return sortItems(publishedContent);
}
export function sortItems<T extends ContentItem>(items: T[]): T[] {
    return items.sort((a, b) => {
        if (b.favorite === a.favorite) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return b.favorite ? 1 : -1;
    });
}
export async function convertSlateToHtml(slateContent): Promise<string> {
    // Convert the Slate content to HTML
    const HTMLString = convertLexicalToHTML({data: slateContent}).replaceAll("/api/", `${CMS_URL}/api/`);
    // Replace the CMS URL with the actual URL

    return HTMLString;
}
