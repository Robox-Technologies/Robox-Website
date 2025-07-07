import { getCart, refreshCart, setCartItem, getItem, removeCartItem} from "@root/cart"
import { renderCart } from "@root/shop"
import { register } from "module"

const availableHolder = document.querySelector("#available-section")
const preorderHolder = document.querySelector("#preorder-section")

const cartItemElement: HTMLTemplateElement = document.querySelector("#cart-item")

function renderItemSubtotal(itemId: string) {
    let products = getCart()["products"];
    let subtotalElement = document.getElementById(itemId).querySelector(".cart-item-text-subtotal");

    if (!subtotalElement) return;

    if (!(itemId in products)) {
        subtotalElement.textContent = "$0";
        return;
    }

    let updatedProduct = products[itemId];
    let updatedProductData = updatedProduct["data"];
    let updatedQuantity = updatedProduct["quantity"]

    subtotalElement.textContent = `$${updatedProductData.price * updatedQuantity}`;
}

function renderPreview() {
    document.querySelectorAll(".cart-item-holder").forEach((e) => e.replaceChildren());
    let products = getCart()["products"]
    let cartEmpty = true;
    for (const productId in products) {
        const product = products[productId]["data"]
        if (!product || productId == "") continue
    
        let price = product["price"]
        let name = product["name"]
        let image = product["images"][0]
        let status = product["status"]
        let quantity = products[productId]["quantity"]
        if (Number(quantity) === 0) {
            removeCartItem(productId)
            continue
        }
        let clone = cartItemElement.content.cloneNode(true) as HTMLElement;
        let titleElement = clone.querySelector(".cart-item-text-title") as HTMLSpanElement
        let priceElement = clone.querySelector(".cart-item-text-price") as HTMLSpanElement
        let quantityInput = clone.querySelector(".cart-quantity") as HTMLInputElement
        let imageElement = clone.querySelector(".cart-item-photo") as HTMLImageElement
        
        imageElement.src = image
        
        titleElement.textContent = name
        priceElement.textContent = `$${price}/each`
        
        quantityInput.value = quantity.toString()
    
        let productElement = clone.querySelector(".cart-item")
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
        let increaseButton = quantityButton.querySelector(".increase-cart-button") as HTMLButtonElement
        let decreaseButton = quantityButton.querySelector(".decrease-cart-button") as HTMLButtonElement
        let productId = quantityButton.closest(".cart-item").id
        let quantityElement = quantityButton.querySelector(".cart-quantity") as HTMLInputElement
        quantityElement.addEventListener("input", (e) => {
            quantityElement.value = quantityElement.value.slice(0, 2);
            let numberValue = Number(quantityElement.value) ?? 0;
            updateCart(productId, numberValue);
        })
        increaseButton.addEventListener("click", (e) => {
            updateCart(productId, Number(quantityElement.value)+1)
        })
        decreaseButton.addEventListener("click", (e) => {
            if (Number(quantityElement.value)-1 < 0) return
            updateCart(productId, Number(quantityElement.value)-1)
        })
    }
    
    const deleteButtons = document.querySelectorAll(".cart-item-delete")
    for (const deleteButton of deleteButtons) {
        let productId = deleteButton.closest(".cart-item").id
        deleteButton.addEventListener("click", () => {
            removeCartItem(productId)
            renderCart()
            renderPreview()
        })
    }
}

function updateCart(productId: string, quantity: number) {
    quantity = Math.min(Math.max(quantity, 0), 99);
    let productElement = document.getElementById(productId)
    let quantityInput = productElement.querySelector(".cart-quantity") as HTMLInputElement
    let products = getCart()["products"]
    quantityInput.value = quantity.toString()
    setCartItem(productId, Number(quantity), products[productId]["data"])
    renderCart()
    renderItemSubtotal(productId);
}