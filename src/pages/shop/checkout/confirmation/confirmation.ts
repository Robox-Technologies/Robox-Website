import { wipeCart, stripePublishableKey } from "@root/cart";
import { loadStripe } from '@stripe/stripe-js';

const urlParams = new URLSearchParams(window.location.search);
const paymentIntentClientSecret = urlParams.get("payment_intent_client_secret");

if (paymentIntentClientSecret) {
    try {
        const stripe = await loadStripe(stripePublishableKey);
        
        let result = "retry";
        while (result === "retry") {
            result = await pollIntent(stripe);
        }
    } catch (error) {
        console.warn("loadStripe/pollIntent failed with error: ", error);
        showFailure();
    }
} else {
    console.warn("No payment intent client secret found in URL params");
    showFailure();
}

function showSuccess(email: string) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("failure").style.display = "none";
    document.getElementById("success").style.display = "block";
    document.getElementById("email").textContent = email;
    wipeCart();
}

function showFailure() {
    document.getElementById("loading").style.display = "none";
    document.getElementById("failure").style.display = "block";
    document.getElementById("success").style.display = "none";
}

async function pollIntent(stripe: Stripe): Promise<string> {
    let paymentIntentResult = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
    let paymentIntent = paymentIntentResult.paymentIntent;

    if (!paymentIntent || paymentIntent.status === "processing") return "retry";
    

    if (paymentIntent.status === "succeeded") {
        showSuccess(paymentIntent.receipt_email);
    } else {
        showFailure();
    }
}