import Clipper from '@/components/Clipper'
import FooterLink from './footerLink'

import {
    faXTwitter,
    faInstagram,
    faLinkedin,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import eyes from '@/images/goobers/eyes.svg'

/**
 * Divider plus bottom row. Rendered twice: once dark in the footer's own flow,
 * and once white inside the clipped red block, which masks the white copy down
 * to the red wedge. That's how the original gets a divider that reads black over
 * the white background and white over the red one — no colour maths, just two
 * copies of the same markup landing in the same place.
 */
function FooterBottomBar({ tone }: { tone: 'dark' | 'light' }) {
    const light = tone === 'light'
    return (
        <div className="flex w-full flex-col gap-4 md:absolute md:bottom-3 md:left-0">
            <hr
                className={`mx-8 h-0.5 w-auto border-0 md:mx-12 ${light ? 'bg-white' : 'bg-black'}`}
            />
            <div
                className={`flex w-full flex-col gap-2 px-8 pb-6 md:flex-row md:justify-between md:px-12 md:pb-0 ${light ? '[&_*]:text-white' : ''}`}
            >
                <p className="text-left md:flex-1 md:text-nowrap">
                    © {new Date().getFullYear()} Ro/Box. All rights reserved.
                </p>
                <p className="md:flex-1 md:text-center md:text-nowrap">
                    Contact us at{' '}
                    <a href="mailto:hello@robox.com.au" className="underline">
                        hello@robox.com.au
                    </a>
                </p>
                <a
                    href="/privacy"
                    className="w-fit underline md:flex-1 md:text-right md:text-nowrap"
                >
                    Privacy Policy
                </a>
            </div>
        </div>
    )
}

export default function Footer() {
    return (
        <footer className="relative isolate flex w-full flex-col items-center gap-4 border-t-2 border-gray-300 md:h-85">
            {/* The angled red block, and with it the eyes, only exist once
                there's room for them. */}
            <div className="absolute inset-y-0 right-0 z-10 hidden w-1/4 md:block">
                <Clipper
                    side="left"
                    gradient="positive"
                    className="relative h-full w-full overflow-hidden bg-red"
                    overhang="3vw"
                >
                    {/* This block is a quarter of the footer, so 400% of it is
                        the full footer width — that lets the masked copies use
                        the same offsets as the originals. */}
                    <div className="absolute inset-y-0 right-0 w-[400%]">
                        <img
                            src={eyes.src}
                            alt=""
                            aria-hidden="true"
                            /* Bottom edge on the footer's midline, left edge on
                               the clipped diagonal, matching the original. No
                               transform utilities here — the eye-tracking script
                               in StandardLayout owns this element's transform. */
                            className="eyes absolute bottom-1/2 left-[calc(75%+3vw)] w-[195px] max-w-full"
                        />
                        <FooterBottomBar tone="light" />
                    </div>
                </Clipper>
            </div>
            <div className="flex w-full flex-col gap-8 px-8 py-10 md:flex-row md:justify-start md:gap-40 md:px-12">
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Pages</h2>
                    <FooterLink href="/teacher">Teacher Resources</FooterLink>
                    <FooterLink href="/hub">Ro/Box Hub</FooterLink>
                    <FooterLink href="/shop">Shop</FooterLink>
                </div>
                <div id="contactUs" className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Connect With Us</h2>
                    <FooterLink href="https://www.instagram.com/robox.kit" external>
                        <FontAwesomeIcon
                            className="h-6 w-6"
                            icon={faInstagram}
                        />{' '}
                        Instagram
                    </FooterLink>
                    <FooterLink href="https://x.com/robox_kit" external>
                        <FontAwesomeIcon
                            className="h-6 w-6"
                            icon={faXTwitter}
                        />{' '}
                        X/Twitter
                    </FooterLink>
                    <FooterLink
                        href="https://www.linkedin.com/company/roboxeducation"
                        external
                    >
                        <FontAwesomeIcon
                            className="h-6 w-6"
                            icon={faLinkedin}
                        />{' '}
                        Linkedin
                    </FooterLink>
                </div>
            </div>
            {/* Sits under the red block so the wedge masks it — see
                FooterBottomBar. */}
            <div className="z-0 w-full">
                <FooterBottomBar tone="dark" />
            </div>
        </footer>
    )
}
