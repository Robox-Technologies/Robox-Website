import HeaderLink from './HeaderLink';
import Logo from '@images/logo-full.svg?react';
const HeaderHeight = 64;
export default function Header() {
    return (
        <header className="sticky top-0 z-50 flex items-center justify-between bg-primary w-full" style={{ height: HeaderHeight }}>
            <nav className="mx-16 flex items-center flex-row w-full font-medium text-lg" >
                <div className='flex flex-row items-center space-x-6'> 
                    <a href="/" className="flex items-center p-4">
                        <Logo className="h-8 w-auto" />
                    </a>
                    <HeaderLink href="/">Ro/Box</HeaderLink>
                    <HeaderLink href="/">Ro/Box</HeaderLink>

                </div>
                <div className="links ml-auto flex items-center space-x-6 text-white">
                    <HeaderLink href="/">Ro/Box</HeaderLink>
                    <HeaderLink href="/">Ro/Box</HeaderLink>
                    <HeaderLink href="/">Ro/Box</HeaderLink>
                    <HeaderLink href="/">Ro/Box</HeaderLink>
                    <HeaderLink href="/">Ro/Box</HeaderLink>

                </div>
            </nav>
        </header>
    );
}