// Load all product thumbnails using Webpack require.context
const thumbnails = require.context(
    "../images/product", // relative path to your images folder
    true,                 // recursive through subfolders
    /thumbnail\.(png|jpe?g)$/i // match png/jpg/jpeg, case-insensitive
);

// Map of productName -> image URL
export const productThumbnails: Record<string, string> = {};

thumbnails.keys().forEach((key) => {
    // key looks like: "./robot/thumbnail.png"
    const parts = key.split("/");
    const productName = parts[1]; // "robot", "sensor", etc.
    
    let url = thumbnails(key); // Webpack returns the final URL

    // Fix double public path issue (only if it occurs)
    if (url.includes("/public/imagespublic/images")) {
        url = url.replace("/public/imagespublic/images", "/public/images");
    }

    productThumbnails[productName] = url;
});

// Preload function for hover or other interactions
export function preloadThumbnails() {
    Object.values(productThumbnails).forEach((src) => {
        const img = new Image();
        img.src = src;
    });
}

