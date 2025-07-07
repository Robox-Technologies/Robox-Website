import { createTransport } from "nodemailer";
import fs from "fs";
import {JSDOM } from "jsdom";
import { Stripe } from "stripe";
const SUCCESS_EMAIL_TEMPLATE = new JSDOM(fs.readFileSync("./src/templates/email/success.html"))

const transporter = createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
export type ProductEmail = Record<string, {
    quantity: number;
    price: number;
}>
export function sendSuccessEmail(to: string, subject: string, products: ProductEmail, paymentIntent: Stripe.PaymentIntent): Promise<void> {
    let document = SUCCESS_EMAIL_TEMPLATE.window.document;

    const dateElement = document.querySelector("#date");
    const emailElement = document.querySelector("#email");
    const orderIdElement = document.querySelector("#order-id");

    if (!orderIdElement || !dateElement || !emailElement) {
        throw new Error("Required elements not found in the email template");
    }
    const date = new Date().toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const orderId = paymentIntent.id;
    const total = paymentIntent.amount_received / 100;

    dateElement.textContent = date;
    emailElement.textContent = to;
    orderIdElement.textContent = orderId;

    for (const [productId, { quantity, price }] of Object.entries(products)) {
        let productLine = document.createElement("tr");
        let productName = document.createElement("td");
        let productQuantity = document.createElement("td");
        let productPrice = document.createElement("td");

        productName.textContent = productId;
        productQuantity.textContent = quantity.toString();
        productPrice.textContent = `$${(price)}`

        productLine.appendChild(productName);
        productLine.appendChild(productQuantity);
        productLine.appendChild(productPrice);
        document.querySelector(".order-table")?.insertAdjacentElement("beforeend", productLine);
    }
    const totalElement = document.querySelector("#total");
    if (totalElement) {
        totalElement.textContent = `$${total.toFixed(2)}`;
    }
    const htmlContent = document.documentElement.outerHTML;
    return sendEmail(to, subject, htmlContent);
}

async function sendEmail(to: string, subject: string, content: string): Promise<void> {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: content,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
    }
}
async function loadTemplate(templatePath: string): Promise<string> {
    try {
        const template = await fs.promises.readFile(templatePath, "utf-8");
        return template;
    } catch (error) {
        console.error(`Error loading email template from ${templatePath}:`, error);
        throw new Error("Failed to load email template");
    }
}
export default transporter;