import { getCart, stripePublishableKey } from "@root/payment/cart";
import { Appearance, loadStripe } from '@stripe/stripe-js';
import { Product } from "~types/api.js";
import "@root/payment/shop";
import { calculateTotalCost, cartToDictionary } from "@root/payment/stripe-shared-helper";

const cart = getCart();
const cartProducts = Object.keys(cart["products"]).reduce((acc: Record<string, Product>, productId: string) => {
    const productData = cart["products"][productId]["data"];
    acc[productId] = productData;
    return acc;
}, {});

const totalCost = (await calculateTotalCost(cartToDictionary(), cartProducts)).total;

const appearance: Appearance = {
    theme: "flat",
    variables: {
        spacingUnit: '4px',

    }
}

const submitButton = document.getElementById("submit") as HTMLButtonElement;
const paymentLoader = document.getElementById("paymentLoader") as HTMLDivElement;
const form = document.getElementById('payment-form') as HTMLFormElement;
const messageContainer = document.getElementById('error-message') as HTMLParagraphElement;

const totalValue = document.getElementById("total-value") as HTMLParagraphElement;
const shippingValue = document.getElementById("shipping-cost") as HTMLParagraphElement;

let paymentProcessing = false;
let shippingPricingValid = false;

updateShippingObfuscation(true);

// Don't accept payments below 50c (min charge amount)
if (totalCost < 50) {
    console.error("Payment too insignificant!");
    checkoutErrored();
} else {
    const stripePromise = loadStripe(stripePublishableKey);
    const clientSecretPromise = getPaymentIntent();
    const paymentPromises = Promise.all([stripePromise, clientSecretPromise]);
    
    paymentPromises.then((values) => {
        const [stripe, { client_secret, paymentIntentID }] = values
        if (!client_secret) {
            checkoutErrored();
            return;
        }
    
        const options = {
            clientSecret: client_secret,
            appearance: appearance
        };
        const elements = stripe.elements(options)
        const addressElement = elements.create('address', {
            mode: "shipping"
        });
        addressElement.mount('#address-element');
        const paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');
        paymentElement.on("loaderstart", () => {
            document.getElementById("spinner").style.display = "none"
            document.getElementById("email").style.display = "block" 
            document.getElementById("email-label").style.display = "block"
            document.getElementById("stripe-content").style.justifyContent = "flex-start"
        })

        addressElement.on("change", async (event) => {
            const country = event.value.address.country;
            const postcode = event.value.address.postal_code;
            if (!country || !postcode) return;

            // Recalculate shipping cost
            shippingPricingValid = false;
            updateSubmitButton();

            const newCosts = await updatePaymentIntentShipping(paymentIntentID, country, postcode);

            if (newCosts) {
                // Pricing updated successfully
                totalValue.textContent = newCosts.displayTotal;
                shippingValue.textContent = newCosts.displayShipping;
                shippingPricingValid = true;

                updateSubmitButton();
                updateShippingObfuscation(false);
            } else {
                // Price update unsuccessful
                updateShippingObfuscation(true);
            }
        });
    
        document.getElementById("termsConsent").addEventListener("click", () => {
            updateSubmitButton();
        });
    
        form.addEventListener("change", () => {
            messageContainer.textContent = "";
            updateSubmitButton();
        });
    
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
    
            paymentProcessing = true;
            updateSubmitButton();
    
            const email = (document.getElementById("email") as HTMLInputElement).value;
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/shop/checkout/confirmation`,
                    receipt_email: email,
                },
            });
    
            paymentProcessing = false;
            updateSubmitButton();
    
            if (error) {
                console.warn(`Payment failed with error ${error.code}: ${error.message}`);
    
                // Don't show message for incomplete fields.
                if (!error.message.endsWith("incomplete.") && error.message !== "Please provide your full name.") {
                    messageContainer.textContent = error.message;
                }
            } 
        });
    }).catch((error) => {
        console.warn(error);
        checkoutErrored();
    });
}

async function getPaymentIntent() {
    const clientSecret = await fetch("/api/store/create", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            products: cartToDictionary(),
            expected_price: totalCost
        })
    });

    return (await clientSecret.json());
}

async function updateShippingObfuscation(obfuscate: boolean) {
    if (obfuscate) {
        shippingValue.textContent = "AU$0.00";
        shippingValue.classList.add("obfuscated");
    } else {
        shippingValue.classList.remove("obfuscated");
    }
}

async function updatePaymentIntentShipping(paymentIntent: string, country: string, postcode: string) {
    const updatedPricing = await fetch("/api/store/updateShipping", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            paymentIntentID: paymentIntent,
            products: cartToDictionary(),
            country: country,
            postcode: postcode
        })
    });

    if (updatedPricing.ok) {
        return (await updatedPricing.json()).verifiedServerCost;
    } else {
        return undefined;
    }
}

function checkoutErrored() {
    // Error fetching secret. Handle and show appropriate error
    document.getElementById("checkout-error").style.display = "block";
    document.getElementById("payment-form").style.display = "none";
}

function updateSubmitButton() {
    const formValid = form.checkValidity();
    submitButton.disabled = !formValid || paymentProcessing || !shippingPricingValid;

    paymentLoader.style.display = paymentProcessing ? "block" : "none";
}
