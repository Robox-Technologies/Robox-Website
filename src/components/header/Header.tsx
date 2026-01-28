import Clipper from '../Clipper';
import HeaderLink from './HeaderLink';
import Logo from '@images/logo-full.svg?react';
import WorkshopLogo from '@images/logo-workshop.svg?react';
import { faCompass, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import StoreLink from './StoreLink';
const headerHeight = 64;
const headerEndPadding = 16;
const extraClipperPadding = 32;
const overhang = `${(headerEndPadding + extraClipperPadding)/2}px`;
export default function Header({type}: {type?: 'standard' | 'workshop'}) {
    return (
        <header className={`sticky top-0 z-50 flex items-center justify-between w-full ${type === 'workshop' ? 'bg-blue' : 'bg-primary'}`} style={{ height: headerHeight }}>
            <nav className="flex items-center h-full flex-row w-full font-medium text-lg" style={{marginLeft: headerEndPadding}} >
                <div className='flex flex-row items-center space-x-6'> 
                    <a href="/" className="flex items-center p-4">
                        {type === 'workshop' ? <WorkshopLogo className="h-8 w-auto" /> : <Logo className="h-8 w-auto" />}
                    </a>
                    <HeaderLink href="/" className={type === 'workshop' ? 'text-white' : ''} >About</HeaderLink>
                    <HeaderLink href="/" className={type === 'workshop' ? 'text-white' : ''}>Contact</HeaderLink>

                </div>
                <Clipper className={`ml-auto ${type === 'workshop' ? 'bg-red' : 'bg-blue'} h-full`} gradient='positive' side='left' overhang={overhang}>
                    <div className="links h-full flex items-center space-x-6 text-white" style={{paddingLeft: headerEndPadding + extraClipperPadding, paddingRight: headerEndPadding + extraClipperPadding}}>
                        <HeaderLink icon={faCompass} className='text-white' href="/student">Ro/Box Hub</HeaderLink>
                        <HeaderLink icon={faGraduationCap} className='text-white' href="/teacher">Teacher Resources</HeaderLink>
                        {type === 'standard' && <StoreLink />}

                    </div>
                </Clipper>
            </nav>
        </header>
    );
}