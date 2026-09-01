import { emailAsset } from './assets';

/**
 * Self-hosted Nunito (headings) and Nunito Sans (body) webfaces.
 *
 * Transcribed verbatim from the original site's
 * `src/templates/email/nunitoFont.css`, including every unicode-range subset
 * and the variable `font-weight: 200 1000` range.
 *
 * This replaces jsx-email's <Font> component, which emits a blanket
 * `* { font-family: ... }` rule - with two fonts the second declaration wins
 * everywhere and the headings lose Nunito. Scoping font-family per element
 * (see styles.ts) is the only way to keep the original's two-font split.
 *
 * The woff2 files are served from our own domain rather than
 * fonts.gstatic.com, for two reasons: Resend's deliverability report flags
 * remote assets that don't align with the sending domain, and a gstatic `src`
 * makes every recipient's mail client announce the open to Google. The files
 * live in this repo at `public/email/fonts/` and resolve through the same
 * EMAIL_ASSET_BASE as the images - see assets.ts, including the note about the
 * currently deployed site's path. A 404 here is not fatal: every font-family in
 * styles.ts ends in `sans-serif`, so a face that fails to load degrades to the
 * same system sans that Gmail and Outlook already fall back to.
 *
 * All five subsets per family are kept, not just latin: `unicode-range` means a
 * client only fetches the subset it actually needs, and customer names in a
 * receipt do carry Vietnamese and Cyrillic characters.
 */

/** `src` value for one subset, resolved against the email asset base. */
const face = (filename: string): string =>
    `url(${emailAsset(`fonts/${filename}`)}) format('woff2')`;

export const fontFaceCss = `
/* cyrillic-ext */
@font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 200 1000;
    font-display: swap;
    src: ${face('nunito-cyrillic-ext.woff2')};
    unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

/* cyrillic */
@font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 200 1000;
    font-display: swap;
    src: ${face('nunito-cyrillic.woff2')};
    unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

/* vietnamese */
@font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 200 1000;
    font-display: swap;
    src: ${face('nunito-vietnamese.woff2')};
    unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

/* latin-ext */
@font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 200 1000;
    font-display: swap;
    src: ${face('nunito-latin-ext.woff2')};
    unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* latin */
@font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 200 1000;
    font-display: swap;
    src: ${face('nunito-latin.woff2')};
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* cyrillic-ext */
@font-face {
    font-family: 'Nunito Sans';
    font-style: normal;
    font-weight: 200 1000;
    font-stretch: 100%;
    font-display: swap;
    src: ${face('nunito-sans-cyrillic-ext.woff2')};
    unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

/* cyrillic */
@font-face {
    font-family: 'Nunito Sans';
    font-style: normal;
    font-weight: 200 1000;
    font-stretch: 100%;
    font-display: swap;
    src: ${face('nunito-sans-cyrillic.woff2')};
    unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

/* vietnamese */
@font-face {
    font-family: 'Nunito Sans';
    font-style: normal;
    font-weight: 200 1000;
    font-stretch: 100%;
    font-display: swap;
    src: ${face('nunito-sans-vietnamese.woff2')};
    unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

/* latin-ext */
@font-face {
    font-family: 'Nunito Sans';
    font-style: normal;
    font-weight: 200 1000;
    font-stretch: 100%;
    font-display: swap;
    src: ${face('nunito-sans-latin-ext.woff2')};
    unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* latin */
@font-face {
    font-family: 'Nunito Sans';
    font-style: normal;
    font-weight: 200 1000;
    font-stretch: 100%;
    font-display: swap;
    src: ${face('nunito-sans-latin.woff2')};
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`;
