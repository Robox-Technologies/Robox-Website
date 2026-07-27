import * as React from 'react';
import { Body, ColorScheme, Head, Html, Preview } from 'jsx-email';

import { fontFaceCss } from '../fonts';
import { bodyStyle, cellStyle, containerStyle, globalCss } from '../styles';

/**
 * Shared <Html>/<Head>/<Body> wrapper used by every Ro/Box transactional email.
 *
 * Replicates, from the original templates:
 *  - metadata.html  -> viewport / x-apple-disable-message-reformatting / charset /
 *                      color-scheme meta tags
 *  - email.css      -> base body styles, the centred 700px container, dark-mode
 *                      colour overrides, color-scheme support
 *  - nunitoFont.css -> "Nunito" (headings) and "Nunito Sans" (body) webfonts
 *
 * Both the font block and the container are hand-rolled rather than using
 * jsx-email's <Font> and <Container>; see the comments on each below.
 */

export interface EmailLayoutProps {
    /** Short preview text shown by recipient email clients in the inbox list. */
    previewText: string;
    /** Document <title>. */
    title: string;
    children: React.ReactNode;
}

export const EmailLayout = ({ previewText, title, children }: EmailLayoutProps) => {
    return (
        <Html lang="en">
            <Head>
                <title>{title}</title>

                {/*
                  Emits the color-scheme / supported-color-schemes metas plus the
                  `:root { color-scheme: light dark }` rule, matching email.css.
                  This is what actually opts the email in to dark mode.
                */}
                <ColorScheme mode="light dark" />

                {/*
                  Hand-rolled in place of two <Font> components. <Font> emits a
                  blanket `* { font-family: ... }`, so with two fonts the second
                  wins everywhere and headings lose Nunito. Here the faces are
                  declared once and font-family is applied per element from
                  styles.ts, preserving the original's heading/body split.

                  No MSO conditional is needed for the Outlook fallback: every
                  font-family is written as a stack ending in `sans-serif`, and
                  Outlook's Word engine ignores @font-face and falls through to
                  it. (The original tried to ship an MSO <style> via
                  metadata.html, but that partial never actually injected.)
                */}
                {/*
                  Both stylesheets are injected via dangerouslySetInnerHTML
                  rather than as children. jsx-email HTML-escapes text children
                  even inside <style>, which turns `'Nunito'` into
                  `&#x27;Nunito&#x27;` and `>` into `&gt;` - silently breaking
                  every @font-face rule and any child-combinator selector.
                */}
                <style type="text/css" dangerouslySetInnerHTML={{ __html: fontFaceCss }} />

                <style type="text/css" dangerouslySetInnerHTML={{ __html: globalCss }} />
            </Head>
            <Preview>{previewText}</Preview>
            <Body style={bodyStyle}>
                {/*
                  Hand-rolled in place of <Container>, which wraps its contents
                  in a hardcoded `max-width: 600px` div and would clamp the
                  original's 700px. This mirrors the original's structure
                  exactly: a full-width table whose single centred cell holds
                  the .email-container div.
                */}
                <table
                    align="center"
                    width="100%"
                    role="presentation"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    style={{ width: '100%' }}
                >
                    <tbody>
                        <tr>
                            <td align="center" style={cellStyle}>
                                <div style={containerStyle}>{children}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Body>
        </Html>
    );
};

export default EmailLayout;
