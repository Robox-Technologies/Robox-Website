import * as React from 'react';
import { Link, Text } from 'jsx-email';

import { linkStyle, textStyle } from '../styles';

export interface SignOffProps {
    /** The sentence(s) preceding the "Cheers," closing, e.g. help/contact copy. */
    children: React.ReactNode;
}

/**
 * Shared closing paragraph: contact copy + "Cheers, The Ro/Box Team" signature.
 * Mirrors the trailing <p> in both success.html and failure.html.
 */
export const SignOff = ({ children }: SignOffProps) => {
    return (
        <Text style={textStyle}>
            {children}
            <br />
            <br />
            Cheers,
            <br />
            The Ro/Box Team
        </Text>
    );
};

export const SupportLink = () => (
    <Link href="mailto:hello@robox.com.au" style={linkStyle}>
        hello@robox.com.au
    </Link>
);

export default SignOff;
