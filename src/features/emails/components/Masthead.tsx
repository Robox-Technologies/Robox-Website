import { Link, Section } from 'jsx-email';

import { emailAsset } from '../assets';
import { cellStyle, logoStyle, mastheadStyle } from '../styles';
import { ThemedImg } from './ThemedImg';

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
                                <ThemedImg
                                    src={emailAsset('logo.png')}
                                    darkSrc={emailAsset('logo-dark.png')}
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
