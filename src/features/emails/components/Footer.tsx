import { Link, Section, Text } from 'jsx-email';

import { alignRight, footerStyle, subLinkStyle, subStyle, topCellStyle } from '../styles';

/**
 * Company address / ABN / contact footer, shown at the bottom of every email.
 * Mirrors footer.html + the `.footer` / `.sub` rules in email.css.
 */
export const Footer = () => {
    return (
        <Section style={footerStyle}>
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
                        <td align="left" style={topCellStyle}>
                            <Text style={subStyle}>
                                Ro/Box Technologies
                                <br />
                                20 Coleridge Street
                                <br />
                                Elwood VIC 3184
                                <br />
                                Australia
                            </Text>
                        </td>
                        <td align="right" style={topCellStyle}>
                            <Text style={{ ...subStyle, ...alignRight }}>
                                ABN 89 684 550 249
                                <br />
                                <Link href="mailto:hello@robox.com.au" style={subLinkStyle}>
                                    hello@robox.com.au
                                </Link>
                                <br />
                                <Link href="tel:+61422987506" style={subLinkStyle}>
                                    +61 422 987 506
                                </Link>
                            </Text>
                        </td>
                    </tr>
                </tbody>
            </table>
        </Section>
    );
};

export default Footer;
