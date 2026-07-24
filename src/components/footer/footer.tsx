import Clipper from '@/components/Clipper'
import FooterLink from './footerLink'

import {
    faXTwitter,
    faInstagram,
    faLinkedin,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import FooterLine from './footerLine'

export default function Footer() {
    return (
        <footer className="relative w-full border-t-2 border-gray-300 md:h-85 flex flex-col items-center gap-4">
            <div className="absolute w-1/4 h-full right-0 top-0">
                <Clipper
                    side="left"
                    gradient="positive"
                    className="w-full bg-red h-full"
                    overhang="3vw"
                />
            </div>
            <div className="w-full px-8 md:px-12 py-10 flex flex-col gap-8 md:flex-row md:justify-start md:gap-40">
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Pages</h2>
                    <FooterLink href="/teacher">Teacher Resources</FooterLink>
                    <FooterLink href="/student">Ro/Box Hub</FooterLink>
                    <FooterLink href="/shop">Shop</FooterLink>
                </div>
                <div className="flex flex-col gap-4">
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
            <FooterLine />
            <div className="w-full px-8 md:px-12 pb-6 md:pb-0 flex flex-col gap-2 md:flex-row md:justify-between z-10">
                <p className="md:flex-1 md:text-nowrap text-left">
                    © {new Date().getFullYear()} Ro/Box. All rights reserved.
                </p>
                <p className="md:flex-1 md:text-nowrap md:text-center">
                    Contact us at{' '}
                    <a href="mailto:hello@robox.com.au" className="underline">
                        hello@robox.com.au
                    </a>
                </p>
                <a
                    href="/privacy"
                    className="underline md:flex-1 md:text-nowrap md:text-right md:text-white w-fit"
                >
                    Privacy Policy
                </a>
            </div>
        </footer>
    )
}
