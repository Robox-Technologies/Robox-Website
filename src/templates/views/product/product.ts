import { addCartItem, refreshCart } from "@root/payment/cart";
import { formatPrice } from "@root/payment/stripe-shared-helper";

// TODO: Find a non-hacky way fetching currentProduct without @ts-ignore
// @ts-expect-error Fetched from HTML
const product = currentProduct;

const productId = product["item_id"]

const carouselImageContainer = document.getElementById("image-carousel")
const carouselImages = document.querySelectorAll(".carousel-image") as NodeListOf<HTMLDivElement>;
const heroImages = document.querySelectorAll(".hero-image")
const modalImage = document.getElementById("hero-image-large") as HTMLImageElement;

const rightCarouselButtons = document.querySelectorAll(".carousel-right-button")
const leftCarouselButtons = document.querySelectorAll(".carousel-left-button")

const cartQuantityInput = document.querySelector(".cart-quantity") as HTMLInputElement;
const increaseQuantityButton = document.querySelector(".increase-cart-button");
const decreaseQuantityButton = document.querySelector(".decrease-cart-button");

const addToCartButton = document.getElementById("add-to-cart");
const cartModal = document.getElementById("cart-modal") as HTMLDialogElement;
const productImageModal = document.getElementById("productImageModal") as HTMLDialogElement;

let quantity = 1;
let currentImageIndex = 0;

for (const button of leftCarouselButtons) {
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (button.classList.contains("carousel-button-disabled")) return;
        changeHeroImage(currentImageIndex-1, true);
    });
}

for (const button of rightCarouselButtons) {
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (button.classList.contains("carousel-button-disabled")) return;
        changeHeroImage(currentImageIndex+1, true);
    });
}

document.getElementById("hero-image-container").addEventListener("click", () => {
    productImageModal.showModal();
});

increaseQuantityButton.addEventListener("click", () =>{
    updateInputQuantity(quantity+1);
});
decreaseQuantityButton.addEventListener("click", () => {
    if (quantity < 1) return;
    updateInputQuantity(quantity-1);
});
cartQuantityInput.addEventListener("input", () => {
    cartQuantityInput.value = cartQuantityInput.value.slice(0, 2);
    const numberValue = Number(cartQuantityInput.value ?? 0);
    quantity = numberValue;
});

function updateInputQuantity(amount: number) {
    quantity = Math.min(Math.max(amount, 1), 99);
    cartQuantityInput.value = quantity.toString();
    refreshCart();
}

addToCartButton.addEventListener("click", () => {
    addCartItem(productId, quantity, product);
    refreshCart();

    document.getElementById("modal-quantity").textContent = quantity.toString();
    document.getElementById("modal-total-price").innerText = formatPrice(product.price * quantity, true);
    cartModal.showModal();
});

document.getElementById("dismiss-modal").addEventListener("click", () => {
    cartModal.close();
})

for (const carouselImage of carouselImages) {
    carouselImage.addEventListener("click", (e) => {
        const divElement = (e.target as HTMLElement).closest("div");
        changeHeroImage(Array.prototype.indexOf.call(divElement.parentNode.children, divElement));
    });
}

function changeHeroImage(number: number, autoscroll: boolean = false) {
    for (const button of leftCarouselButtons) {
        if (number === 0) {
            button.classList.add("carousel-button-disabled");
        } else if (button.classList.contains("carousel-button-disabled")) {
            button.classList.remove("carousel-button-disabled");
        }
    }

    for (const button of rightCarouselButtons) {
        if (number === carouselImages.length-1) {
            button.classList.add("carousel-button-disabled");
        } else if (button.classList.contains("carousel-button-disabled")) {
            button.classList.remove("carousel-button-disabled");
        }
    }

    const carouselThumb = carouselImages[currentImageIndex];
    carouselThumb.querySelector("img").classList.remove("selected-carousel");

    const heroImage = heroImages[number] as HTMLImageElement;
    document.querySelector(".active")?.classList.remove("active");
    heroImage.classList.add("active");
    modalImage.src = heroImage.src;

    carouselImages[number].querySelector("img").classList.add("selected-carousel");
    currentImageIndex = number;

    // Scroll if out of bounds
    if (!autoscroll) return;

    const thumbTop = carouselThumb.offsetTop - carouselThumb.clientHeight*3 - 15;
    const thumbBottom = carouselThumb.offsetTop + carouselThumb.clientHeight;

    if (thumbTop < carouselImageContainer.scrollTop) {
        carouselImageContainer.scrollTo({
            top: thumbTop,
            behavior: "smooth",
        });
    } else if (thumbBottom > carouselImageContainer.clientHeight + carouselImageContainer.scrollTop) {
        carouselImageContainer.scrollTo({
            top: thumbBottom - carouselImageContainer.clientHeight,
            behavior: "smooth",
        });
    }
}