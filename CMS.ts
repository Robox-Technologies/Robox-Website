const CMS_URL = process.env.CMS_URL || 'http://localhost:3000';

export interface CMSArticle {
    createdAt: string;
    type: string;
    updatedAt: string;
    title: string;
    slug: string;
    content: object;
    filename: string | null;
    mimetype: string | null;
    url: string | null;
}
export interface CaseStudy extends CMSArticle {
    type: 'case-study';
}  


export async function getCMSCollection(collectionName: string): Promise<CMSArticle[]> {
    const response = await fetch(`${CMS_URL}/api/${collectionName}?pagination=false`);
    if (!response.ok) {
        console.warn(`Failed to fetch collection ${collectionName}: ${response.statusText}`);
        return [];
    }
    const collection = (await response.json())["docs"];

    return collection;
}
export async function getCMSArticles(): Promise<CMSArticle[]> {
    const articles = await getCMSCollection('articles');
    for (const item of articles) {
        const itemSlug = item.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        item.slug = itemSlug;
    }
    // most recent articles we want to show first
    articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return articles;
}