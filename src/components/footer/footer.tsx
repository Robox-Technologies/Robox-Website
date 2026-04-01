import Clipper from '@components/Clipper'
import FooterLink from './footerLink'

import {
    faXTwitter,
    faInstagram,
    faLinkedin,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import FooterLine from './footerLine'
// TODO: make this responsive
export default function Footer() {
    return (
        <footer className="w-full border-t-2 border-gray-300 h-85 flex flex-col items-center gap-4 ">
            <div className="absolute w-1/4 h-85 right-0">
                <Clipper
                    side="left"
                    gradient="positive"
                    className="w-full bg-red h-full"
                    overhang="3vw"
                />
            </div>
            <div className="w-full px-12 py-10 flex flex-row justify-start gap-40">
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Pages</h2>
                    <FooterLink href="/">Teacher Resources</FooterLink>
                    <FooterLink href="/about">Ro/Box Hub</FooterLink>
                    <FooterLink href="/contact">Shop</FooterLink>
                </div>
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Connect With Us</h2>
                    <FooterLink href="/contact">
                        <FontAwesomeIcon
                            className="h-6 w-6"
                            icon={faInstagram}
                        />{' '}
                        Instagram
                    </FooterLink>
                    <FooterLink href="/contact">
                        <FontAwesomeIcon
                            className="h-6 w-6"
                            icon={faXTwitter}
                        />{' '}
                        X/Twitter
                    </FooterLink>
                    <FooterLink href="/contact">
                        <FontAwesomeIcon
                            className="h-6 w-6"
                            icon={faLinkedin}
                        />{' '}
                        Linkedin
                    </FooterLink>
                </div>
            </div>
            <FooterLine />
            <div className="w-full px-12 flex flex-row justify-between z-10">
                <p className="text-nowrap">
                    © {new Date().getFullYear()} Ro/Box. All rights reserved.
                </p>
                <p className="text-nowrap">
                    Contact us at{' '}
                    <a href="mailto:hello@robox.com.au" className="underline">
                        hello@robox.com.au
                    </a>
                </p>
                <a
                    href="/privacy-policy"
                    className="underline text-white text-nowrap"
                >
                    Privacy Policy
                </a>
            </div>
        </footer>
    )
}
