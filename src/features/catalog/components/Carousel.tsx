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
        // 60vh with a 500px floor and a 1.4 hero ratio — a wider ratio squeezes the
        // info column beside it.
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
                    aria-label="Previous photo"
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
                    aria-label="Next photo"
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
        // Fixed 115px, dropped below 940px; thumbnails shrink to share the height rather than scroll.
        <div
            role="group"
            aria-label="Product photos"
            className="flex flex-col shrink-0 items-center gap-[4px] overflow-y-auto overflow-x-hidden h-full w-[115px] max-[940px]:hidden"
        >
            {images.map((image, index) => (
                <CarouselSideBarItem
                    image={image}
                    key={index}
                    index={index}
                    total={images.length}
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
    index,
    total,
    isActive,
    onClick,
}: {
    image: CarouselImage
    index: number
    total: number
    isActive: boolean
    onClick: () => void
}) {
    return (
        // A real <button> so the rail is keyboard-drivable. `overflow-hidden` is
        // load-bearing: it zeroes the flex item's automatic minimum size.
        <button
            type="button"
            aria-label={`Show photo ${index + 1} of ${total}`}
            aria-pressed={isActive}
            onClick={onClick}
            className="carousel-item overflow-hidden block w-[115px] h-[115px] rounded-lg appearance-none border-0 bg-transparent p-0"
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
        </button>
    )
}
