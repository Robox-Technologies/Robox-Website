import { Hr, Link, Section, Text } from 'jsx-email';

import { emailAsset } from '../assets';
import {
    cellStyle,
    hrStyle,
    SOCIAL_HR_CLASS,
    socialsCaptionStyle,
    socialsStyle
} from '../styles';
import { ThemedImg } from './ThemedImg';

const SOCIAL_LINKS = [
    {
        href: 'https://www.instagram.com/robox.kit',
        icon: 'instagram.png',
        alt: 'Instagram'
    },
    {
        href: 'https://x.com/robox_kit',
        icon: 'x.png',
        alt: 'X (formerly Twitter)'
    },
    {
        href: 'https://www.linkedin.com/company/roboxeducation',
        icon: 'linkedin.png',
        alt: 'LinkedIn'
    }
];

/** "instagram.png" -> "instagram-dark.png" */
const darkVariant = (filename: string) => filename.replace(/\.png$/, '-dark.png');

/**
 * "Stay up to date with us!" social icon row, shown on the receipt email.
 * Mirrors the `.socials` block in success.html + the `.socials` /
 * `.socialButtons` rules in email.css.
 *
 * The empty cells on either end are load-bearing: they absorb the leftover
 * width so the three fixed 40px cells sit together in the middle. Without them
 * the icons spread out to the thirds of the table.
 */
export const Socials = () => {
    return (
        <Section style={socialsStyle}>
            <Text style={socialsCaptionStyle}>Stay up to date with us!</Text>

            <Hr className={SOCIAL_HR_CLASS} style={hrStyle} />

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
                        <th style={cellStyle} />
                        {SOCIAL_LINKS.map((social) => (
                            <th
                                key={social.alt}
                                align="center"
                                style={{ ...cellStyle, width: '40px' }}
                            >
                                <Link href={social.href} target="_blank">
                                    <ThemedImg
                                        src={emailAsset(social.icon)}
                                        darkSrc={emailAsset(darkVariant(social.icon))}
                                        alt={social.alt}
                                        width="24"
                                        height="24"
                                    />
                                </Link>
                            </th>
                        ))}
                        <th style={cellStyle} />
                    </tr>
                </tbody>
            </table>
        </Section>
    );
};

export default Socials;
