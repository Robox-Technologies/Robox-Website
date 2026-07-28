import type * as React from 'react';

/**
 * Shared styles for the transactional emails.
 *
 * Transcribed 1:1 from the original site's `src/templates/email/email.css`,
 * which was applied by running the assembled document through `juice` to
 * inline every rule. jsx-email has no equivalent step for hand-written CSS, so
 * the same declarations live here as style objects and are spread onto the
 * components directly.
 *
 * Anything that *cannot* be inlined - the dark-mode media query, and the
 * @font-face set - stays as raw CSS in `globalCss` / `fontFaceCss` below and is
 * emitted inside a <style> tag by EmailLayout.
 */

export const colors = {
    /** Body copy and headings in light mode. */
    text: '#405C64',
    /** Body copy and headings in dark mode. */
    textDark: '#F8F8F8',
    /** Ro/Box coral, used for the table rules and the button. */
    accent: '#FF6166',
    /** Muted grey for the socials caption and horizontal rule. */
    muted: '#717171',
    /** Discount line in light mode. */
    discount: '#4AA21E',
    /** Discount line in dark mode - lighter, for contrast. */
    discountDark: '#91CC31',
    buttonText: '#F8F8F8'
} as const;

export const fonts = {
    /** h1/h2/h3. */
    heading: "'Nunito', sans-serif",
    /** Body copy, links and small print. */
    body: "'Nunito Sans', sans-serif"
} as const;

/* Base ------------------------------ */

export const bodyStyle: React.CSSProperties = {
    width: '100%',
    margin: 0,
    WebkitTextSizeAdjust: 'none',
    boxSizing: 'border-box'
};

export const containerStyle: React.CSSProperties = {
    maxWidth: '700px',
    padding: '32px',
    textAlign: 'left',
    // The original centred via `<td align="center">`, which does not actually
    // centre a block-level div. Kept explicit here so wide viewports centre.
    margin: '0 auto'
};

/**
 * `td { word-break: break-word }`. Applied per-cell rather than via a
 * stylesheet so it survives clients that strip <style> - long addresses and
 * product names would otherwise overflow on narrow screens.
 */
export const cellStyle: React.CSSProperties = {
    wordBreak: 'break-word'
};

export const hrStyle: React.CSSProperties = {
    backgroundColor: colors.muted,
    height: '2px',
    border: 'none',
    // jsx-email's <Hr> ships a default `border-top: 1px solid #eaeaea` that
    // would otherwise draw a stray line under the 2px bar.
    borderTop: 'none'
};

/* Fonts ------------------------------ */

const headingBase: React.CSSProperties = {
    color: colors.text,
    fontFamily: fonts.heading,
    fontWeight: 'bold',
    textAlign: 'left'
};

const headingSizes = {
    h1: '22px',
    h2: '16px',
    h3: '14px'
} as const;

/** `h1, h2, h3` - colour, Nunito, bold, left-aligned, at the original sizes. */
export const heading = (as: keyof typeof headingSizes): React.CSSProperties => ({
    ...headingBase,
    fontSize: headingSizes[as]
});

/** `p` - colour, 14px Nunito Sans, 150% line height. */
export const textStyle: React.CSSProperties = {
    color: colors.text,
    fontSize: '14px',
    fontFamily: fonts.body,
    lineHeight: '150%'
};

/**
 * `a` - matches `p` for size/family/line-height. The original left link colour
 * to the client default; jsx-email's default (#067df7) is kept because it stays
 * legible in both colour schemes, where the UA default #0000EE does not.
 */
export const linkStyle: React.CSSProperties = {
    fontSize: '14px',
    fontFamily: fonts.body,
    lineHeight: '150%'
};

/** `.sub, .sub a` - the 11px footer print. */
export const subStyle: React.CSSProperties = {
    ...textStyle,
    fontSize: '11px',
    margin: 0
};

export const subLinkStyle: React.CSSProperties = {
    ...linkStyle,
    fontSize: '11px'
};

/** `th > p, td > p, th > h3, td > h3 { margin: 16px 0 }`. */
export const cellTextStyle: React.CSSProperties = {
    ...textStyle,
    margin: '16px 0'
};

export const cellHeadingStyle: React.CSSProperties = {
    ...heading('h3'),
    margin: '16px 0'
};

/* Utilities ------------------------------ */

export const alignLeft: React.CSSProperties = { textAlign: 'left' };
export const alignRight: React.CSSProperties = { textAlign: 'right' };
export const alignCenter: React.CSSProperties = { textAlign: 'center' };

/* Buttons ------------------------------ */

/**
 * `.button` in email.css, as props for jsx-email's <Button>.
 *
 * `align` is set explicitly because <Button> defaults to 'left'. The font has
 * to come through `style`: <Button> sets no font-family, so the anchor would
 * otherwise fall back to the client default (a serif face), where the original
 * picked up Nunito Sans from the `p, a` rule.
 */
export const buttonStyle = {
    align: 'center',
    backgroundColor: colors.accent,
    textColor: colors.buttonText,
    width: 150,
    height: 40,
    borderRadius: 20,
    fontSize: 14,
    style: { fontFamily: fonts.body }
} as const;

/* Purchase summary ------------------------------ */

export const summaryStyle: React.CSSProperties = { marginTop: '32px' };

export const purchaseContentStyle: React.CSSProperties = {
    width: '100%',
    margin: 0,
    padding: '25px 0 0 0'
};

/** `td.small { width: 15%; min-width: 90px }` - the quantity/price columns. */
export const smallCellStyle: React.CSSProperties = {
    ...cellStyle,
    width: '15%',
    minWidth: '90px'
};

export const purchaseTotalStyle: React.CSSProperties = {
    ...cellTextStyle,
    textAlign: 'right',
    fontWeight: 'bold'
};

export const purchaseTotalLabelStyle: React.CSSProperties = {
    ...purchaseTotalStyle,
    padding: '0 15px 0 0',
    textAlign: 'left'
};

export const rowSeparateStyle: React.CSSProperties = {
    borderBottom: `1px solid ${colors.accent}`
};

export const feeRowStyle: React.CSSProperties = {
    borderTop: `1px solid ${colors.accent}`
};

/**
 * `.discount-row > p`. The `discount-row` class must stay on the wrapping cell
 * so the dark-mode override in `globalCss` can reach this text.
 */
export const discountTextStyle: React.CSSProperties = {
    ...cellTextStyle,
    fontStyle: 'italic',
    color: colors.discount,
    marginTop: 0
};

/* Masthead / body / footer ------------------------------ */

export const mastheadStyle: React.CSSProperties = { marginBottom: '64px' };

export const logoStyle: React.CSSProperties = { maxWidth: '250px' };

export const billingDetailsStyle: React.CSSProperties = { marginBottom: '32px' };

export const topCellStyle: React.CSSProperties = {
    ...cellStyle,
    verticalAlign: 'top'
};

export const socialsStyle: React.CSSProperties = { marginTop: '64px' };

export const socialsCaptionStyle: React.CSSProperties = {
    ...cellTextStyle,
    width: '100%',
    textAlign: 'center',
    color: colors.muted
};

export const footerStyle: React.CSSProperties = { marginTop: '32px' };

/* Non-inlinable CSS ------------------------------ */

/**
 * The `@media (prefers-color-scheme: dark)` block from email.css, plus the
 * `td { word-break }` rule as a belt-and-braces fallback.
 *
 * These declarations are `!important` because an important rule in a
 * stylesheet outranks the non-important inline styles above - that is exactly
 * how the original flipped its colours after juice had inlined everything.
 *
 * Note the descendant selector `.discount-row p` where the original used the
 * child combinator `.discount-row > p`. jsx-email HTML-escapes <style> contents,
 * so a `>` ships as `&gt;` and silently invalidates the whole selector. The two
 * are equivalent here - the <p> is always a direct child of the cell.
 */
export const globalCss = `
td { word-break: break-word; }

.dark-img { display: none; mso-hide: all; }

@media (prefers-color-scheme: dark) {
  p, h1, h2, h3 {
    color: ${colors.textDark} !important;
  }

  .discount-row p {
    color: ${colors.discountDark} !important;
  }

  .light-img { display: none !important; }
  .dark-img { display: block !important; }
}
`;
