import { getCart, removeCartItem, setCartItem } from "@root/cart"
import { renderCart } from "@root/shop"
import { formatPrice } from "@root/stripe-shared-helper"
const availableHolder = document.querySelector("#available-section")
const preorderHolder = document.querySelector("#preorder-section")

const cartItemElement: HTMLTemplateElement = document.querySelector("#cart-item")

// @ts-expect-error Fetch from HTML
const localProducts = products;

function renderItemSubtotal(itemId: string) {
    const products = getCart(localProducts)["products"];
    const subtotalElement = document.getElementById(itemId).querySelector(".cart-item-text-subtotal");

    if (!subtotalElement) return;

    if (!(itemId in products)) {
        subtotalElement.textContent = "$0";
        return;
    }

    const updatedProduct = products[itemId];
    const updatedProductData = updatedProduct["data"];
    const updatedQuantity = updatedProduct["quantity"]

    subtotalElement.textContent = formatPrice(updatedProductData.price * updatedQuantity, true);
}

function renderPreview() {
    document.querySelectorAll(".cart-item-holder").forEach((e) => e.replaceChildren());
    const products = getCart(localProducts).products
    let cartEmpty = true;
    for (const productId in products) {
        const product = products[productId].data;
        const cachedProduct = localProducts[productId];

        if (!product || !cachedProduct || productId == "") continue;
    
        const price = formatPrice(product.price)
        const name = product.name
        const status = product.status
        const quantity = products[productId].quantity

        if (Number(quantity) === 0) {
            removeCartItem(productId)
            continue
        }

        const clone = cartItemElement.content.cloneNode(true) as HTMLElement;
        const titleElement = clone.querySelector(".cart-item-text-title") as HTMLSpanElement
        const priceElement = clone.querySelector(".cart-item-text-price") as HTMLSpanElement
        const quantityInput = clone.querySelector(".cart-quantity") as HTMLInputElement
        const imageElement = clone.querySelector(".cart-item-photo") as HTMLImageElement
        
        const productImage = document.getElementById(`hidden-${cachedProduct.internalName}`) as HTMLImageElement;
        imageElement.src = productImage.src;
        imageElement.alt = productImage.alt;
        
        titleElement.textContent = name
        priceElement.textContent = `${price}/each`
        
        quantityInput.value = quantity.toString()
    
        const productElement = clone.querySelector(".cart-item")
        productElement.id = product["item_id"]
        productElement.setAttribute("price-id", product["price_id"])

        if (status === "available") {
            availableHolder.querySelector(".cart-item-holder").appendChild(clone)
        } else {
            preorderHolder.querySelector(".cart-item-holder").appendChild(clone)
        }

        renderItemSubtotal(product["item_id"]);
        cartEmpty = false;
    }

    if (cartEmpty) {
        document.getElementById("empty-cart").style.display = "flex";
        document.getElementById("main-content").style.display = "none";
    } else {
        registerQtyButtons();
    }
}
renderPreview()

function registerQtyButtons() {
    const quantityButtons = document.querySelectorAll(".cart-quantity-button")
    for (const quantityButton of quantityButtons) {
        const increaseButton = quantityButton.querySelector(".increase-cart-button") as HTMLButtonElement
        const decreaseButton = quantityButton.querySelector(".decrease-cart-button") as HTMLButtonElement
        const productId = quantityButton.closest(".cart-item").id
        const quantityElement = quantityButton.querySelector(".cart-quantity") as HTMLInputElement

        quantityElement.addEventListener("input", () => {
            quantityElement.value = quantityElement.value.slice(0, 2);
            const numberValue = Number(quantityElement.value ?? 0);
            updateCart(productId, numberValue);
        })

        increaseButton.addEventListener("click", () => {
            updateCart(productId, Number(quantityElement.value)+1)
        })

        decreaseButton.addEventListener("click", () => {
            if (Number(quantityElement.value)-1 < 0) return
            updateCart(productId, Number(quantityElement.value)-1)
        })
    }
    
    const deleteButtons = document.querySelectorAll(".cart-item-delete")
    for (const deleteButton of deleteButtons) {
        const productId = deleteButton.closest(".cart-item").id
        deleteButton.addEventListener("click", () => {
            removeCartItem(productId)
            renderCart()
            renderPreview()
        })
    }
}

function updateCart(productId: string, quantity: number) {
    quantity = Math.min(Math.max(quantity, 0), 99);
    const productElement = document.getElementById(productId)
    const quantityInput = productElement.querySelector(".cart-quantity") as HTMLInputElement
    const products = getCart(localProducts)["products"]
    quantityInput.value = quantity.toString()
    setCartItem(productId, Number(quantity), products[productId]["data"])
    renderCart()
    renderItemSubtotal(productId);
}