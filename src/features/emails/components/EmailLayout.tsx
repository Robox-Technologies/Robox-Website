import * as React from 'react';
import { Body, ColorScheme, Head, Html, Preview } from 'jsx-email';

import { fontFaceCss } from '../fonts';
import { bodyStyle, cellStyle, containerStyle, globalCss } from '../styles';

/**
 * Shared <Html>/<Head>/<Body> wrapper for every transactional email. The font block
 * and the container are hand-rolled rather than jsx-email's; see the notes below.
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

                {/* Opts the email in to dark mode: the color-scheme metas plus `:root { color-scheme }`. */}
                <ColorScheme mode="light dark" />

                {/* Hand-rolled: <Font> emits a blanket `* { font-family }`, so two of them
                    would cost the headings their Nunito. */}
                {/* dangerouslySetInnerHTML because jsx-email HTML-escapes text children
                    even inside <style>, breaking @font-face and `>` selectors. */}
                <style type="text/css" dangerouslySetInnerHTML={{ __html: fontFaceCss }} />

                <style type="text/css" dangerouslySetInnerHTML={{ __html: globalCss }} />
            </Head>
            <Preview>{previewText}</Preview>
            <Body style={bodyStyle}>
                {/* Hand-rolled: <Container> hardcodes `max-width: 600px` and would clamp this to under 700px. */}
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
