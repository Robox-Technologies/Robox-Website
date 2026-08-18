import Button from '@/components/button'
import {
    faChevronLeft,
    faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import type { ImageMetadata } from 'astro'
import { useState } from 'react'

/** A product photo plus the description of what's in it. */
export interface CarouselImage {
    src: ImageMetadata
    alt: string
}

export default function Carousel({ images }: { images: CarouselImage[] }) {
    const [currentIndex, setCurrentIndex] = useState(0)

    return (
        // 60vh tall with a 500px floor, and a 1.4 hero aspect ratio, as on the
        // original. The ratio matters beyond the image itself: it's what leaves
        // room for the info column beside it (a 16/9 hero squeezed that column
        // down to ~240px at 1440px wide).
        <div className="carousel flex flex-row h-[60vh] min-h-[500px] gap-[10px] max-[940px]:h-auto max-[940px]:min-h-0">
            <CarouselSideBar
                images={images}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
            />
            <div className="carousel-main relative">
                <Button
                    className="absolute top-1/2 left-8 -translate-y-1/2 z-10 bg-white/75 backdrop-blur-[2px] p-0! rounded-full w-10 h-10"
                    iconStyle="text-black w-[18px] h-[18px]"
                    icon={faChevronLeft}
                    onClick={() =>
                        setCurrentIndex(
                            (currentIndex - 1 + images.length) % images.length,
                        )
                    }
                />
                <img
                    src={images[currentIndex].src.src}
                    alt={images[currentIndex].alt}
                    className="h-[60vh] min-h-[500px] block object-contain aspect-[1.4] max-[940px]:h-auto max-[940px]:min-h-0 max-[940px]:max-h-[60vh] max-[940px]:w-full"
                />
                <Button
                    className="absolute top-1/2 right-8 -translate-y-1/2 z-10 bg-white/75 backdrop-blur-[2px] p-0! rounded-full w-10 h-10"
                    iconStyle="text-black w-[18px] h-[18px]"
                    icon={faChevronRight}
                    onClick={() =>
                        setCurrentIndex((currentIndex + 1) % images.length)
                    }
                />
            </div>
        </div>
    )
}

function CarouselSideBar({
    images,
    currentIndex,
    setCurrentIndex,
}: {
    images: CarouselImage[]
    currentIndex: number
    setCurrentIndex: (index: number) => void
}) {
    return (
        // The rail is a fixed 115px wide and drops out below 940px; its
        // thumbnails shrink to share the carousel's height rather than scroll,
        // same as the original.
        <div className="flex flex-col shrink-0 items-center gap-[4px] overflow-y-auto overflow-x-hidden h-full w-[115px] max-[940px]:hidden">
            {images.map((image, index) => (
                <CarouselSideBarItem
                    image={image}
                    key={index}
                    isActive={index === currentIndex}
                    onClick={() => {
                        setCurrentIndex(index)
                    }}
                />
            ))}
        </div>
    )
}

function CarouselSideBarItem({
    image,
    isActive,
    onClick,
}: {
    image: CarouselImage
    isActive: boolean
    onClick: () => void
}) {
    return (
        <div
            className="carousel-item overflow-hidden block w-[115px] h-[115px] rounded-lg"
            key={image.src.src}
            onClick={onClick}
        >
            <div className="cursor-pointer h-full">
                {/* The rail duplicates the photo already described by the main
                    image, so it stays out of the accessibility tree. */}
                <img
                    src={image.src.src}
                    alt=""
                    className={`w-full h-full block object-cover rounded-lg ${isActive ? 'brightness-[0.6]' : ''}`}
                />
            </div>
        </div>
    )
}
