import { Product } from "types/api";
import { addCartItem, getCart } from "./cart";
import { calculateTotalCost, cartToDictionary, shippingCost } from "./stripe-helper";

const orderValue = document.getElementById("order-value") as HTMLParagraphElement
const totalValue = document.getElementById("total-value") as HTMLParagraphElement
const shippingValue = document.getElementById("shipping-cost") as HTMLParagraphElement



export function renderCart() {
    //Get rid of the quantity stuff
    let cart = getCart();
    let products = Object.keys(cart["products"]).reduce((acc: Record<string, Product>, product: string) => {
        let productData = cart["products"][product]["data"];
        acc[product] = productData;
        return acc;
    }, {});

    let cost = calculateTotalCost(cartToDictionary(), products);

    // Hide checkout button if cost is 0
    let checkoutButton = document.getElementById("checkout");
    if (checkoutButton) {
        if (cost.total <= 0) {
            checkoutButton.style.display = "none";
        } else {
            checkoutButton.style.display = "block";
        }
    }
    if (totalValue && orderValue && shippingValue) {
        orderValue.textContent = `$${cost.products}`;
        totalValue.textContent = `$${cost.total}`;
        shippingValue.textContent = `$${cost.total > 0 ? shippingCost : 0}`;
    }
}

async function getItemData(): Promise<Record<string, Product>> {
    let products = getCart().products;

    // const promises = Object.keys(products).map((productId) =>
    //     fetch(`${window.location.origin}/api/store/products?id=${productId}`).then(async (response) => [productId, await response.json()])
    // );
    const promises = Object.keys(products).map((productId) =>
        fetch(`/api/store/products?id=${productId}`).then(async (response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch product ${productId}: ${response.statusText}`);
            }
            return [productId, await response.json()];
        })
    );

    const data = await Promise.all(promises);
    return Object.fromEntries(data)
}


renderCart();

getItemData().then(serverProducts => {
    let products = getCart().products;
    let reload = false
    for (const serverProductId in serverProducts) {
        let cartProduct = products[serverProductId];
        if (cartProduct && JSON.stringify(serverProducts[serverProductId]) !== JSON.stringify(cartProduct["data"])) {
            reload = true
            addCartItem(serverProductId, 0, serverProducts[serverProductId])
        }
    }
    if (reload) window.location.reload()
})