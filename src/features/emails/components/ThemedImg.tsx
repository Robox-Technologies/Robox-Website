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
 * An image with a separate dark-mode variant.
 *
 * Email has no way to swap an `src` on a media query, so both images ship and
 * one is hidden. The `light-img` / `dark-img` classes are driven by the
 * `prefers-color-scheme` block in styles.ts.
 *
 * The dark variant also carries `display: none` inline, so that clients which
 * strip <style> (where the media query would never run) fall back to showing
 * only the light image rather than stacking both. The stylesheet uses
 * `!important` to override that inline value when dark mode does apply.
 *
 * Clients that honour `prefers-color-scheme` - Apple Mail, iOS Mail, Outlook for
 * Mac/iOS, Thunderbird - get the dark variant. Gmail applies its own colour
 * inversion instead and will keep showing the light one.
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
