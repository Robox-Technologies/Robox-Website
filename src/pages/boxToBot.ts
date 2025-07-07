import img1 from '@images/landing/boxToBot/step1.png';
import img2 from '@images/landing/boxToBot/step2.png';
import img3 from '@images/landing/boxToBot/step3.png';
import img4 from '@images/landing/boxToBot/step4.png';

const images = [img1, img2, img3, img4];

const steps = document.getElementsByClassName("step");
const image = document.getElementsByClassName("boxToBotImg")[0] as HTMLImageElement;
let currentImgIndex = -1;

function updateBoxToBot() {
    let imgIndex = 0;

    for (let i = 0; i < steps.length-1;i++) {
        let step = steps[i];
        let nextStep = steps[i+1];
        let viewportOffset = step.getBoundingClientRect();
        let viewportOffsetNext = nextStep.getBoundingClientRect();
        
        if ((viewportOffset.bottom + viewportOffsetNext.top)/2 > window.innerHeight / 2) break;

        imgIndex += 1;
    }
    
    if (imgIndex != currentImgIndex) {
        image.src = images[imgIndex];

        if (currentImgIndex != -1) {
            image.classList.remove("scale-animate");
            void image.offsetWidth;
            image.classList.add("scale-animate");
        }

        currentImgIndex = imgIndex;
    }
}

document.addEventListener("scroll", updateBoxToBot);