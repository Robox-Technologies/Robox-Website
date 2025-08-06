import { slateToHtml, payloadSlateToHtmlConfig } from '@slate-serializers/html'



const CMS_URL = process.env.CMS_URL || 'http://localhost:3000';

export interface CMSArticle {
    createdAt: string;
    type: string;
    updatedAt: string;
    title: string;
    slug: string;
    content: object[];
    filename: string | null;
    mimetype: string | null;
    html: string | null;
    url: string | null;
}
export interface CaseStudy extends CMSArticle {
    type: 'case-study';
}  


export async function getCMSCollection(collectionName: string): Promise<CMSArticle[] | null> {
    try {
        const response = await fetch(`${CMS_URL}/api/${collectionName}?pagination=false`);
        if (!response.ok) {
            console.warn(`Failed to fetch collection ${collectionName}: ${response.statusText}`);
            return null;
        }
        const collection = (await response.json())["docs"];
        return collection;
    } catch (error) {
        console.error(`Error fetching collection ${collectionName}:`, error);
        return null;
    }

}
export async function getCMSArticles(): Promise<CMSArticle[] | null> {
    const articles = await getCMSCollection('articles');
    if (!articles) return null;
    for (const item of articles) {
        const itemSlug = item.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        item.slug = itemSlug;
    }
    // most recent articles we want to show first
    articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return articles;
}
export async function convertSlateToHtml(slateContent: object[]): Promise<string> {
    
    const HTMLString = slateToHtml([slateContent["root"]], payloadSlateToHtmlConfig).replaceAll("/api/media/file/", `${CMS_URL}/api/media/file/`);

    return HTMLString;
}