const CMS_URL = process.env.CMS_URL || 'http://localhost:3000';

export async function getCMSCollection(collectionName: string) {
    const response = await fetch(`${CMS_URL}/api/${collectionName}?pagination=false`);
    if (!response.ok) {
        console.warn(`Failed to fetch collection ${collectionName}: ${response.statusText}`);
        return [];
    }
    return (await response.json())["docs"];
}