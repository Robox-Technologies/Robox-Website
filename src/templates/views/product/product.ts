import { calculateTotalCost, cartToDictionary } from "@root/stripe-helper";
import { addCartItem, refreshCart } from "@root/cart";

// TODO: Find a non-hacky way fetching currentProduct without @ts-ignore
// @ts-ignore
const product = currentProduct;

const productId = product["item_id"]

const carouselImageContainer = document.getElementById("image-carousel")
const carouselImages = document.querySelectorAll(".carousel-image") as NodeListOf<HTMLDivElement>;
const heroImages = document.querySelectorAll(".hero-image")

const rightCarouselButton = document.getElementById("carousel-right-button")
const leftCarouselButton = document.getElementById("carousel-left-button")

const cartQuantityInput = document.querySelector(".cart-quantity") as HTMLInputElement;
const increaseQuantityButton = document.querySelector(".increase-cart-button");
const decreaseQuantityButton = document.querySelector(".decrease-cart-button");

const addToCartButton = document.getElementById("add-to-cart");
const cartModal = document.getElementById("cart-modal") as HTMLDialogElement;

let quantity = 1;
let currentImageIndex = 0;

rightCarouselButton.addEventListener("click", () => {
    if (rightCarouselButton.classList.contains("carousel-button-disabled")) return;
    changeHeroImage(currentImageIndex+1, true);
});
leftCarouselButton.addEventListener("click", () => {
    if (leftCarouselButton.classList.contains("carousel-button-disabled")) return;
    changeHeroImage(currentImageIndex-1, true);
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
    let numberValue = Number(cartQuantityInput.value) ?? 0;
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
    document.getElementById("modal-total-price").innerText = (Number(product.price) * quantity).toString();
    cartModal.showModal();
});

document.getElementById("dismiss-modal").addEventListener("click", () => {
    cartModal.close();
})

for (const carouselImage of carouselImages) {
    carouselImage.addEventListener("click", (e) => {
        let divElement = (e.target as HTMLElement).closest("div");
        changeHeroImage(Array.prototype.indexOf.call(divElement.parentNode.children, divElement));
    });
}

function changeHeroImage(number: number, autoscroll: boolean = false) {
    if (number === 0) {
        leftCarouselButton.classList.add("carousel-button-disabled");
    } else if (leftCarouselButton.classList.contains("carousel-button-disabled")) {
        leftCarouselButton.classList.remove("carousel-button-disabled");
    }

    if (number === carouselImages.length-1) {
        rightCarouselButton.classList.add("carousel-button-disabled");
    } else if (rightCarouselButton.classList.contains("carousel-button-disabled")) {
        rightCarouselButton.classList.remove("carousel-button-disabled");
    }

    let carouselThumb = carouselImages[currentImageIndex];
    carouselThumb.querySelector("img").classList.remove("selected-carousel");

    document.querySelector(".active")?.classList.remove("active");
    const heroImage = heroImages[number];
    heroImage.classList.add("active");
    carouselImages[number].querySelector("img").classList.add("selected-carousel");
    currentImageIndex = number;

    // Scroll if out of bounds
    if (!autoscroll) return;

    let thumbTop = carouselThumb.offsetTop - carouselThumb.clientHeight*3 - 15;
    let thumbBottom = carouselThumb.offsetTop + carouselThumb.clientHeight;

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