import HeaderLink from './HeaderLink';
import Logo from '@images/logo-full.svg?react';
const HeaderHeight = 64;
export default function Header() {
    return (
        <header className="sticky top-0 z-50 flex items-center justify-between bg-primary w-full" style={{ height: HeaderHeight }}>
            <nav className="container mx-auto flex items-center flex-row">
                <a href="/" className="flex items-center mr-4 h-24">
                    <Logo className='h-16'/>
                </a>
                <div>
                    <HeaderLink href="/">Ro/Box</HeaderLink>
                </div>
            </nav>
        </header>
    );
}