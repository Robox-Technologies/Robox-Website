import { WorkspaceSvg } from "blockly";
const ratio = 16/9;
const padding = 30;
const finalWidth = 250*2;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Download screenshot.
 * @author samelh@google.com (Sam El-Husseini)
 */
export function svgToPng_(data: string, width: number, height: number, callback: (url: string) => void) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const img = new Image();

    const pixelDensity = finalWidth/width;
    canvas.width = width * pixelDensity;
    canvas.height = height * pixelDensity;
    img.onload = function () {
        if (!context) return
        context.drawImage(img, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
        try {
            const dataUri = canvas.toDataURL('image/png');
            callback(dataUri);
        } catch {
            console.warn('Error converting the workspace svg to a png');
            callback('');
        }
    };
    img.src = data;
}
export function workspaceToSvg_(workspace: WorkspaceSvg, callback: (url: string) => void, customCss = "") {
    // Go through all text areas and set their value.
    const textAreas = document.getElementsByTagName("textarea");
    for (let i = 0; i < textAreas.length; i++) {
        textAreas[i].innerHTML = textAreas[i].value;
    }

    const bBox = workspace.getBlocksBoundingBox();
    let x = bBox.left;
    let y = bBox.top;
    let width = bBox.right - x;
    let height = bBox.bottom - y;

    if (width === 0 || height === 0) {
        width = 100;
        height = 100;
    }
    
    // Aspect ratio
    if (width>height) {
        y -= (width/ratio - height)/2;
        height = width / ratio;
    } else {
        x -= (height*ratio - width)/2;
        width = height * ratio;
    }

    const blockCanvas = workspace.getCanvas();
    
    const clone = blockCanvas.cloneNode(true) as SVGElement;
    clone.removeAttribute('transform');

    // Add padding
    x -= padding;
    y -= padding;
    width += padding*2;
    height += padding*2;


    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const patterns = workspace.getParentSvg().querySelectorAll("defs");
    for (const pattern of patterns) {
        svg.appendChild(pattern.cloneNode(true));
    }
    if (!patterns || !patterns[0] || !patterns[0].firstChild) return ''
    const patternId = (patterns[0].firstChild as SVGDefsElement).id;
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', "200%");
    bgRect.setAttribute('height', "200%");
    bgRect.setAttribute('x', x.toString());
    bgRect.setAttribute('y', y.toString());
    bgRect.setAttribute("style", `fill: url("#${patternId}"); transform: translate(-24px, -16px);`);
    svg.appendChild(bgRect);

    svg.appendChild(clone);
    svg.setAttribute('viewBox', x + ' ' + y + ' ' + width + ' ' + height);

    svg.setAttribute('class', 'blocklySvg ' +
        (workspace.options.renderer || 'geras') + '-renderer ' +
        (workspace.getTheme ? workspace.getTheme().name + '-theme' : ''));
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute("style", 'background-color: #E6F0FF;');

    const css = [].slice.call(document.head.querySelectorAll('style'))
        .filter(function (el: HTMLStyleElement) {
            return /\.blocklySvg/.test(el.innerText) ||
                (el.id.indexOf('blockly-') === 0);
        }).map(function (el: HTMLStyleElement) {
            return el.innerText;
        }).join('\n');
        const style = document.createElement('style');
    style.innerHTML = css + '\n' + customCss;
    svg.insertBefore(style, svg.firstChild);

    let svgAsXML = (new XMLSerializer).serializeToString(svg);
    svgAsXML = svgAsXML.replace(/&nbsp/g, '&#160');
    const data = 'data:image/svg+xml,' + encodeURIComponent(svgAsXML);

    svgToPng_(data, width, height, callback);
}