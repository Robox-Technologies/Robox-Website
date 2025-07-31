import { Product } from "~types/api";
import { getCart } from "./cart";
import { calculateTotalCost, cartToDictionary } from "./stripe-shared-helper";

const orderValue = document.getElementById("order-value") as HTMLParagraphElement
const totalValue = document.getElementById("total-value") as HTMLParagraphElement
const shippingValue = document.getElementById("shipping-cost") as HTMLParagraphElement



export function renderCart() {
    //Get rid of the quantity stuff
    const cart = getCart();
    const products = Object.keys(cart.products).reduce((acc: Record<string, Product>, productId: string) => {
        const productData = cart.products[productId].data;
        acc[productId] = productData;
        return acc;
    }, {});

    const cost = calculateTotalCost(cartToDictionary(), products);

    // Hide checkout button if cost is 0
    const checkoutButton = document.getElementById("checkout");
    if (checkoutButton) {
        if (cost.total <= 0) {
            checkoutButton.style.display = "none";
        } else {
            checkoutButton.style.display = "block";
        }
    }
    if (totalValue && orderValue && shippingValue) {
        orderValue.textContent = cost.displayProducts;
        totalValue.textContent = cost.displayTotal;
        shippingValue.textContent = cost.displayShipping;
    }
}

async function getItemData(): Promise<Record<string, Product>> {
    const products = getCart().products;

    const promises = Object.keys(products).map(async (productId) => {
        const response = await fetch(`/api/store/products?id=${productId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch product ${productId}: ${response.statusText}`);
        }

        return [productId, await response.json()];
    });

    const data = await Promise.all(promises);
    return Object.fromEntries(data)
}

const serverProducts = await getItemData();
getCart(serverProducts);

renderCart();