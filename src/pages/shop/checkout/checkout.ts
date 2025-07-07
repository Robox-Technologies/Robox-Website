import { getCart, stripePublishableKey } from "@root/cart";
import { Appearance, loadStripe } from '@stripe/stripe-js';
import { Product } from "types/api";
import "@root/shop";
import { calculateTotalCost, cartToDictionary } from "@root/stripe-helper";




const cart = getCart();
let products = Object.keys(cart["products"]).reduce((acc: Record<string, Product>, product: string) => {
    let productData = cart["products"][product]["data"];
    acc[product] = productData;
    return acc;
}, {});

let totalCost = calculateTotalCost(cartToDictionary(), products).total;

const appearance: Appearance = {
    theme: "flat",
    variables: {
        spacingUnit: '4px',

    }
}

const stripePromise = loadStripe(stripePublishableKey);
const clientSecretPromise = getPaymentIntent()
const paymentPromises = Promise.all([stripePromise, clientSecretPromise])

const submitButton = document.getElementById("submit") as HTMLButtonElement;

paymentPromises.then((values) => {
    const [stripe, clientSecret] = values

    if (!clientSecret) {
        checkoutErrored();
        return;
    }

    const options = {
        clientSecret: clientSecret,
        appearance: appearance
    };
    const elements = stripe.elements(options)
    const addressElement = elements.create('address', {
        mode: "shipping",
        allowedCountries: ['AU']
    });
    addressElement.mount('#address-element');
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');
    paymentElement.on("loaderstart", (event) => {
        document.getElementById("spinner").style.display = "none"
        document.getElementById("email").style.display = "block" 
        document.getElementById("email-label").style.display = "block"
        document.getElementById("stripe-content").style.justifyContent = "flex-start"
    })

    const form = document.getElementById('payment-form') as HTMLFormElement;

    document.getElementById("termsConsent").addEventListener("click", () => {
        submitButton.disabled = !form.checkValidity();
    });

    form.addEventListener("change", () => {
        submitButton.disabled = !form.checkValidity();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = (document.getElementById("email") as HTMLInputElement).value;
        const {error} = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/shop/checkout/confirmation`,
                receipt_email: email,
            },
        });

        if (error) {
            const messageContainer = document.querySelector('#error-message');
            messageContainer.textContent = error.message;
        } 
    });
}).catch((error) => {
    console.warn(error);
    checkoutErrored();
});
  

async function getPaymentIntent() {
    const clientSecret = await fetch("/api/store/create", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            products: cartToDictionary(),
            expected_price: totalCost
        })
    });

    return (await clientSecret.json()).client_secret;
}

function checkoutErrored() {
    // Error fetching secret. Handle and show appropriate error
    document.getElementById("checkout-error").style.display = "block";
    document.getElementById("payment-form").style.display = "none";
}
