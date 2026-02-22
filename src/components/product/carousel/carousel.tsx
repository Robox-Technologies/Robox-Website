import Button from '@components/button';
import { faChevronCircleRight, faChevronCircleLeft, faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
export default function Carousel({ images }: { images: ImageMetadata[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    //TODO: Make all the images the same size
    return (
        <div className="carousel flex flex-row h-[60vh] gap-2" >
            <CarouselSideBar images={images} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} />
            <div className="carousel-main relative">
                <Button className="absolute top-1/2 left-4 -translate-y-1/2 z-10 bg-white p-0! rounded-full w-8 h-8" iconStyle='text-gray-500 w-4 h-4' icon={faChevronLeft} onClick={() => setCurrentIndex((currentIndex - 1 + images.length) % images.length)} />
                <img src={images[currentIndex].src} className="h-[60vh] rounded-xl block object-contain" />
                <Button className="absolute top-1/2 right-4 -translate-y-1/2 z-10 bg-white p-0! rounded-full w-8 h-8" iconStyle='text-gray-500 w-4 h-4' icon={faChevronRight} onClick={() => setCurrentIndex((currentIndex + 1) % images.length)} />
                
            </div>
        </div>
    );
}
function CarouselSideBar({images, currentIndex, setCurrentIndex}: {images: ImageMetadata[], currentIndex: number, setCurrentIndex: (index: number) => void}) {
    return (
        <div className="flex flex-col gap-2 overflow-y-auto h-full p-1">
            {images.map((image, index) => (
                <CarouselSideBarItem image={image} key={index} isActive={index === currentIndex} onClick={() => {console.log(index); setCurrentIndex(index)}} />
            ))}
        </div>
    )
}
function CarouselSideBarItem({image, isActive, onClick}: {image: ImageMetadata, isActive: boolean, onClick: () => void}) {
    return (
        <div className={`carousel-item flex-none block w-40 rounded-xl ${isActive ? 'ring-2 ring-blue-500' : ''}`} key={image.src} onClick={onClick}>
            <div className="cursor-pointer">
                <img src={image.src} className="w-full rounded-xl block object-cover aspect-video" />
            </div>
        </div>
    )
}