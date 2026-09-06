/**
 * Absolute URLs for images embedded in the transactional emails — email clients
 * can't resolve relative paths. The live pre-Astro site still serves these from
 * `/public/email/<name>`, so point EMAIL_ASSET_BASE there until this site ships.
 */
const EMAIL_ASSET_BASE = process.env.EMAIL_ASSET_BASE || 'https://robox.com.au/email';

export const emailAsset = (filename: string): string => `${EMAIL_ASSET_BASE}/${filename}`;
