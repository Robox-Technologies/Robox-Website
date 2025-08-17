import { slateToHtml, payloadSlateToHtmlConfig } from '@slate-serializers/html'



const CMS_URL = process.env.CMS_URL || 'http://localhost:3000';
export type ArticleLocation = 'Newsletter' | 'Teacher Resources' | 'Student Resources';
export interface CMSItem {
    createdAt: string;
    updatedAt: string;
    location: ArticleLocation;
    favorite: boolean;
    url: string;
    filename: string | null;
    mimetype: string | null;
    status: "draft" | "published" | "archived";
    title: string;
}
export interface CMSArticle extends CMSItem {
    location: ArticleLocation
    slug: string;
    content: object[];
    dramaticTitle: string;
    author: string | null;
    html: string | null;
    url: string | null;
}
export interface CaseStudy extends CMSArticle {
    type: 'case-study';
}  


async function getCMSCollection(collectionName: string): Promise<CMSItem[] | null> {
    try {
        const response = await fetch(`${CMS_URL}/api/${collectionName}?pagination=false`);
        if (!response.ok) {
            console.warn(`Failed to fetch collection ${collectionName}: ${response.statusText}`);
            return null;
        }
        const collection = (await response.json())["docs"].filter((item: CMSArticle) => {
            return item.status === "published";
        });
        return collection;
    } catch (error) {
        console.error(`Error fetching collection ${collectionName}:`, error);
        return null;
    }

}
async function getCMSArticles(): Promise<CMSArticle[]> {
    // Assert that articles are CMSArticle
    const articles = await getCMSCollection('articles');
    const validArticles: CMSArticle[] = [];
    if (!articles) return [];
    for (const item of articles) {
        if (isCMSArticle(item)) {
            const itemSlug = item.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
            item.slug = itemSlug;
            validArticles.push(item);
        }
    }
    return validArticles;
}
export async function getCMSResources(): Promise<(CMSItem | CMSArticle)[]> {
    const files = await getCMSCollection('resources');
    if (!files) return [];
    const articles = await getCMSArticles();
    return sortItems([...files, ...articles]);
}
export function sortItems<T extends CMSItem>(items: T[]): T[] {
    return items.sort((a, b) => {
        if (b.favorite === a.favorite) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return b.favorite ? 1 : -1;
    });
}
export async function convertSlateToHtml(slateContent: object[]): Promise<string> {
    
    const HTMLString = slateToHtml([slateContent["root"]], payloadSlateToHtmlConfig);

    return HTMLString;
}
function isCMSArticle(item: CMSItem): item is CMSArticle {
    return "title" in item && "content" in item;
}