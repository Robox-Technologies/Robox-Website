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
    return (await response.json())["docs"];
}