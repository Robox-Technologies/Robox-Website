const cartKey = "roboxCart";

export function getCart() {
    if (typeof window === 'undefined') return null;
    const cart = localStorage.getItem(cartKey);
    if (cart) {
        try {
            return JSON.parse(cart) as Record<string, number>;
        } catch (e) {
            console.error("Failed to parse cart from localStorage:", e);
            localStorage.removeItem(cartKey);
        }
    }
    return {};
}
export function updateCart(cart: Record<string, number>) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(cartKey, JSON.stringify(cart));
}
export function addToCart(productId: string, quantity: number) {
    const cart = getCart() || {};
    cart[productId] = (cart[productId] || 0) + quantity;
    updateCart(cart);
}
export function removeFromCart(productId: string) {
    const cart = getCart() || {};
    delete cart[productId];
    updateCart(cart);
}
export function clearCart() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(cartKey);
}