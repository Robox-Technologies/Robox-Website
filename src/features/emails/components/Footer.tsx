import * as React from 'react';
import { Column, Link, Row, Section, Text } from 'jsx-email';

const subStyle: React.CSSProperties = {
    fontSize: '11px',
    margin: 0
};

/**
 * Company address / ABN / contact footer, shown at the bottom of every email.
 * Mirrors footer.html + the `.footer` / `.sub` rules in email.css.
 */
export const Footer = () => {
    return (
        <Section style={{ marginTop: '32px' }}>
            <Row>
                <Column align="left" style={{ verticalAlign: 'top' }}>
                    <Text style={subStyle}>
                        Ro/Box Technologies
                        <br />
                        20 Coleridge Street
                        <br />
                        Elwood VIC 3184
                        <br />
                        Australia
                    </Text>
                </Column>
                <Column align="right" style={{ verticalAlign: 'top' }}>
                    <Text style={{ ...subStyle, textAlign: 'right' }}>
                        ABN 89 684 550 249
                        <br />
                        <Link href="mailto:hello@robox.com.au" style={{ fontSize: '11px' }}>
                            hello@robox.com.au
                        </Link>
                        <br />
                        <Link href="tel:+61422987506" style={{ fontSize: '11px' }}>
                            +61 422 987 506
                        </Link>
                    </Text>
                </Column>
            </Row>
        </Section>
    );
};

export default Footer;
