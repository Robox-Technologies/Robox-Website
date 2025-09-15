const thumbnails = require.context(
    "../images/product",
    true,
    /thumbnail\.(png|jpg|jpeg)$/
);

export const productThumbnails: Record<string, string> = {};
thumbnails.keys().forEach((key) => {
    const productName = key.split("/")[1]; 
    let url = thumbnails(key);

    // idk why this happens but it does
    if (url.startsWith("/public/imagespublic/images")) {
        url = url.replace("/public/imagespublic/images", "/public/images");
    }

    productThumbnails[productName] = url;
});