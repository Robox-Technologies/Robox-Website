declare class LottiePlayer extends HTMLElement {
    play();
    stop();
    setSpeed(speed: number);
    setDirection(direction: number);
    setQuality(quality: string | number);
    setLocationHref(href: string);
    registerAnimation(element: unknown, animationData?: unknown);
    destroy();
}