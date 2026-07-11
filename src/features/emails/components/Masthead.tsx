import * as React from 'react';
import { Column, Img, Link, Row, Section } from 'jsx-email';

/**
 * Logo / masthead, shown at the top of every email.
 * Mirrors masthead.html + the `.masthead` / `.logo` rules in email.css.
 */
export const Masthead = () => {
    return (
        <Section style={{ marginBottom: '64px' }}>
            <Row>
                <Column align="center">
                    <Link href="https://robox.com.au">
                        <Img
                            src="https://robox.com.au/email/logo.png"
                            alt="Ro/Box Logo"
                            width="250"
                            style={{ maxWidth: '250px' }}
                        />
                    </Link>
                </Column>
            </Row>
        </Section>
    );
};

export default Masthead;
