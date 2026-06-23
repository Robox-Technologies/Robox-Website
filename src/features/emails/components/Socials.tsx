import { Column, Hr, Img, Link, Row, Section, Text } from 'jsx-email';

const SOCIAL_LINKS = [
    {
        href: 'https://www.instagram.com/robox.kit',
        icon: 'https://robox.com.au/email/instagram.png',
        alt: 'Instagram'
    },
    {
        href: 'https://x.com/robox_kit',
        icon: 'https://robox.com.au/email/x.png',
        alt: 'X (formerly Twitter)'
    },
    {
        href: 'https://www.linkedin.com/company/roboxeducation',
        icon: 'https://robox.com.au/email/linkedin.png',
        alt: 'LinkedIn'
    }
];

/**
 * "Stay up to date with us!" social icon row, shown on the receipt email.
 * Mirrors the `.socials` block in success.html + the `.socials` / `.socialButtons` rules in email.css.
 */
export const Socials = () => {
    return (
        <Section style={{ marginTop: '64px' }}>
            <Text style={{ width: '100%', textAlign: 'center', color: '#717171' }}>
                Stay up to date with us!
            </Text>

            <Hr style={{ backgroundColor: '#717171', height: '2px', border: 'none' }} />

            <Row>
                {SOCIAL_LINKS.map((social) => (
                    <Column key={social.alt} align="center" style={{ width: '40px' }}>
                        <Link href={social.href} target="_blank">
                            <Img src={social.icon} alt={social.alt} width="24" height="24" />
                        </Link>
                    </Column>
                ))}
            </Row>
        </Section>
    );
};

export default Socials;
