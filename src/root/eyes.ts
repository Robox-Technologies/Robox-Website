(() => {
    const eyes = Array.from(document.getElementsByClassName("eyes")).map(eye => eye as HTMLElement);
    const eyeMaxDist = 5;
    const falloffFac = 200;
    
    let mousePos: {x: number, y: number} | undefined = undefined;
    function updateEyes(event: Event) {
        const mouseEvent = event as MouseEvent;

        if (mouseEvent.clientX != undefined && mouseEvent.clientY != undefined) {
            mousePos = {x: mouseEvent.clientX, y: mouseEvent.clientY};
        } else if (mousePos == undefined) {
            return;
        }

        eyes.forEach(eye => {
            const rootRect = eye.getBoundingClientRect();
            const rootPos = {x:rootRect.x+rootRect.width/2,y:rootRect.y+rootRect.height/2};

            if (rootRect.top > window.innerHeight || rootRect.bottom < 0) return;
            if (mousePos == undefined) return;

            const delta = {
                x: mousePos.x - rootPos.x,
                y: mousePos.y - rootPos.y
            };

            const dist = Math.sqrt(Math.pow(delta.x, 2) + Math.pow(delta.y, 2));
            const deltaNorm = {x:delta.x/dist,y:delta.y/dist};
            const asymptoticDist = -falloffFac/(dist + falloffFac/eyeMaxDist) + eyeMaxDist;
            
            eye.style.transform = `translate(${deltaNorm.x*asymptoticDist}%,${deltaNorm.y*asymptoticDist}%)`;
        });
    }

    document.addEventListener("scroll", updateEyes);
    document.addEventListener("mousemove", updateEyes);
})();