/**
 * Absolute URLs for the images embedded in the transactional emails.
 *
 * Email clients cannot resolve relative paths, so these have to be absolute and
 * publicly reachable. The files live in this repo at `public/email/`, which
 * Astro serves from the site root as `/email/<name>`.
 *
 * Note that the *currently deployed* site is the pre-Astro one, which serves
 * the same images from `/public/email/<name>` - `/email/<name>` there returns
 * the HTML 404 page with a 200 status. So until this site is the one live on
 * robox.com.au, emails sent from a local or staging build will show broken
 * images unless EMAIL_ASSET_BASE is pointed at the old path.
 */
const EMAIL_ASSET_BASE = process.env.EMAIL_ASSET_BASE || 'https://robox.com.au/email';

export const emailAsset = (filename: string): string => `${EMAIL_ASSET_BASE}/${filename}`;
