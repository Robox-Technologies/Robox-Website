const scrollPrompt = document.querySelector(".scroll-prompt") as HTMLElement;
const scrollTarget = document.getElementById("scrollTarget") as HTMLElement;

scrollPrompt.onclick = (e) => {
    e.stopPropagation();

    scrollTarget.scrollIntoView({
        behavior: 'smooth'
    });
}