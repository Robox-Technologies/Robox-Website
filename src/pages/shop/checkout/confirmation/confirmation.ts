import { wipeCart, stripePublishableKey } from "@root/cart";
import { Stripe, loadStripe } from '@stripe/stripe-js';

const urlParams = new URLSearchParams(window.location.search);
const paymentIntentClientSecret = urlParams.get("payment_intent_client_secret");

if (paymentIntentClientSecret) {
    try {
        const stripe = await loadStripe(stripePublishableKey);
        
        let result = "retry";
        while (result === "retry") {
            result = await pollIntent(stripe);

            // Wait 1s before polling again
            await sleep(1000);
        }
    } catch (error) {
        console.warn("loadStripe/pollIntent failed with error: ", error);
        showFailure();
    }
} else {
    console.warn("No payment intent client secret found in URL params");
    showFailure();
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    const paymentIntentResult = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
    const paymentIntent = paymentIntentResult.paymentIntent;

    if (!paymentIntent || paymentIntent.status === "processing") return "retry";
    
    if (paymentIntent.status === "succeeded") {
        showSuccess(paymentIntent.receipt_email);
    } else {
        showFailure();
    }
}