import type * as React from 'react';
import { Img } from 'jsx-email';

export interface ThemedImgProps {
    /** Image shown in light mode, and anywhere the swap is unsupported. */
    src: string;
    /** Image shown in dark mode. */
    darkSrc: string;
    alt: string;
    width: string;
    height: string;
    style?: React.CSSProperties;
}

/**
 * An image with a dark-mode variant. Both ship and one is hidden, since email can't
 * swap an `src` on a media query. The dark one is inline `display: none` so clients
 * that strip <style> show the light image rather than both.
 */
export const ThemedImg = ({ src, darkSrc, alt, width, height, style }: ThemedImgProps) => {
    return (
        <>
            <Img
                src={src}
                alt={alt}
                width={width}
                height={height}
                className="light-img"
                style={style}
            />
            <Img
                src={darkSrc}
                alt={alt}
                width={width}
                height={height}
                className="dark-img"
                style={{
                    ...style,
                    display: 'none',
                    // Outlook's Word engine is unreliable about display:none on
                    // images; mso-hide is what it actually honours.
                    msoHide: 'all'
                } as React.CSSProperties}
            />
        </>
    );
};

export default ThemedImg;
