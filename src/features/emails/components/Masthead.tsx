import { Img, Link, Section } from 'jsx-email';

import { cellStyle, logoStyle, mastheadStyle } from '../styles';

/**
 * Logo / masthead, shown at the top of every email.
 * Mirrors masthead.html + the `.masthead` / `.logo` rules in email.css.
 *
 * The source image is 444x89; width/height attributes are set to the displayed
 * 250x50 so Outlook, which ignores max-width, does not render it at full size.
 */
export const Masthead = () => {
    return (
        <Section style={mastheadStyle}>
            <table
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                role="presentation"
                style={{ width: '100%' }}
            >
                <tbody>
                    <tr>
                        <td align="center" style={cellStyle}>
                            <Link href="https://robox.com.au">
                                <Img
                                    src="https://robox.com.au/email/logo.png"
                                    alt="Ro/Box Logo"
                                    width="250"
                                    height="50"
                                    style={logoStyle}
                                />
                            </Link>
                        </td>
                    </tr>
                </tbody>
            </table>
        </Section>
    );
};

export default Masthead;
