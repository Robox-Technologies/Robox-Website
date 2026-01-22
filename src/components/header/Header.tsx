import Clipper from '../Clipper';
import HeaderLink from './HeaderLink';
import Logo from '@images/logo-full.svg?react';
const headerHeight = 64;
const headerEndPadding = 16;
const extraClipperPadding = 32;
const overhang = (headerEndPadding + extraClipperPadding)/2;
export default function Header() {
    return (
        <header className="sticky top-0 z-50 flex items-center justify-between bg-primary w-full" style={{ height: headerHeight }}>
            <nav className="flex items-center h-full flex-row w-full font-medium text-lg" style={{marginLeft: headerEndPadding}} >
                <div className='flex flex-row items-center space-x-6'> 
                    <a href="/" className="flex items-center p-4">
                        <Logo className="h-8 w-auto" />
                    </a>
                    <HeaderLink href="/">Ro/Box</HeaderLink>
                    <HeaderLink href="/">Ro/Box</HeaderLink>

                </div>
                <Clipper className="ml-auto bg-blue h-full" direction='left' overhang={overhang}>
                    <div className="links h-full flex items-center space-x-6 text-white" style={{paddingLeft: headerEndPadding + extraClipperPadding, paddingRight: headerEndPadding + extraClipperPadding}}>
                        <HeaderLink href="/">Ro/Box Hub</HeaderLink>
                        <HeaderLink href="/">Teacher Resources</HeaderLink>
                        <HeaderLink href="/">Store</HeaderLink>

                    </div>
                </Clipper>
            </nav>
        </header>
    );
}