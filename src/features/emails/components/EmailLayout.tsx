import * as React from 'react';
import { Body, ColorScheme, Conditional, Container, Font, Head, Html, Preview } from 'jsx-email';

/**
 * Shared <Html>/<Head>/<Body> wrapper used by every Ro/Box transactional email.
 *
 * Replicates, from the original templates:
 *  - metadata.html  -> viewport / x-apple-disable-message-reformatting / charset /
 *                      color-scheme meta tags + MSO font fallback conditional comment
 *  - email.css      -> base body styles, dark-mode color overrides, color-scheme support
 *  - nunitoFont.css  -> self-hosted "Nunito" (headings) and "Nunito Sans" (body) webfonts
 */

const bodyStyle: React.CSSProperties = {
    width: '100%',
    margin: 0,
    WebkitTextSizeAdjust: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#FFFFFF'
};

// Dark-mode color overrides that can't be expressed via component props alone
// (mirrors the `@media (prefers-color-scheme: dark)` block in email.css).
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    p, h1, h2, h3 {
      color: #F8F8F8 !important;
    }
    .discount-row > p {
      color: #91CC31 !important;
    }
  }
`;

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

                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="x-apple-disable-message-reformatting" content="" />
                <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />

                <ColorScheme mode="light dark" />

                {/* Nunito - used for headings (h1/h2/h3) */}
                <Font
                    fontFamily="Nunito"
                    fallbackFontFamily={['sans-serif']}
                    fontWeight={700}
                    fontStyle="normal"
                    webFont={{
                        url: 'https://fonts.gstatic.com/s/nunito/v31/XRXV3I6Li01BKofINeaBTMnFcQ.woff2',
                        format: 'woff2'
                    }}
                />

                {/* Nunito Sans - used for body copy, links, and small print */}
                <Font
                    fontFamily="Nunito Sans"
                    fallbackFontFamily={['sans-serif']}
                    fontWeight={400}
                    fontStyle="normal"
                    webFont={{
                        url: 'https://fonts.gstatic.com/s/nunitosans/v18/pe0AMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfUVwoNnq4CLz0_kJ3xzHGGVFM.woff2',
                        format: 'woff2'
                    }}
                />

                {/* MSO (Outlook desktop) font fallback, matches metadata.html's conditional block */}
                <Conditional mso={true}>
                    <style type="text/css">{`h1, h2, h3, p, a { font-family: sans-serif; }`}</style>
                </Conditional>

                <style type="text/css">{darkModeCss}</style>
            </Head>
            <Preview>{previewText}</Preview>
            <Body style={bodyStyle}>
                <Container
                    style={{
                        maxWidth: '700px',
                        padding: '32px',
                        textAlign: 'left',
                        margin: '0 auto'
                    }}
                >
                    {children}
                </Container>
            </Body>
        </Html>
    );
};

export default EmailLayout;
