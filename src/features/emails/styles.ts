import type * as React from 'react';

/**
 * Shared styles for the transactional emails, as inline style objects.
 * What can't be inlined (dark mode, @font-face) lives in `globalCss` / `fontFaceCss`.
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
    /** Discount line in dark mode. */
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
    // Explicit, because `<td align="center">` does not centre a block-level div.
    margin: '0 auto'
};

/** `td { word-break: break-word }`, per-cell so it survives clients that strip <style>. */
export const cellStyle: React.CSSProperties = {
    wordBreak: 'break-word'
};

/** The rule above the social icons. Recolouring the icons means updating `social-hr` too. */
export const hrStyle: React.CSSProperties = {
    backgroundColor: colors.muted,
    height: '2px',
    border: 'none',
    // Cancels jsx-email <Hr>'s default border-top, which draws a stray line under the bar.
    borderTop: 'none'
};

/** Class on the social separator, so the dark-mode rule can reach it. */
export const SOCIAL_HR_CLASS = 'social-hr';

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

/** `h1, h2, h3`. */
export const heading = (as: keyof typeof headingSizes): React.CSSProperties => ({
    ...headingBase,
    fontSize: headingSizes[as]
});

/** `p`. */
export const textStyle: React.CSSProperties = {
    color: colors.text,
    fontSize: '14px',
    fontFamily: fonts.body,
    lineHeight: '150%'
};

/** `a`. Keeps jsx-email's #067df7, which stays legible in both colour schemes. */
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

/** `.button`, as props for jsx-email's <Button>. Font must come through `style`. */
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

/** `.discount-row > p`. The class must stay on the cell for the dark-mode override to reach it. */
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

/* Internal notices ------------------------------ */

/** The sandbox banner on an internal order email. Solid coral so dark mode leaves it alone. */
export const testBannerStyle: React.CSSProperties = {
    backgroundColor: colors.accent,
    borderRadius: '8px',
    padding: '4px 16px',
    marginBottom: '32px'
};

export const testBannerTextStyle: React.CSSProperties = {
    ...textStyle,
    color: colors.buttonText,
    fontWeight: 'bold',
    textAlign: 'center'
};

/* Non-inlinable CSS ------------------------------ */

/**
 * Dark-mode block plus a `td { word-break }` fallback. `!important` so it outranks
 * the inline styles above. No `>` combinators: jsx-email escapes <style> contents.
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

  .${SOCIAL_HR_CLASS} { background-color: ${colors.textDark} !important; }
}
`;
