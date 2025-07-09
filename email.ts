import { createTransport } from "nodemailer";
import fs from "fs";
import {JSDOM } from "jsdom";
import { Stripe } from "stripe";
import juice from "juice";
import { Product } from './types/api';
import { formatPrice } from './src/root/stripe-shared-helper.js';

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
type attachments = {
    filename: string;
    path: string;
    cid: string;
}[];
export async function processEmail(paymentIntent: Stripe.PaymentIntent, subject: string, verifiedProducts: Record<string, Product>, success: boolean): Promise<void> {
    const [to, products] = processPaymentIntent(paymentIntent, verifiedProducts);
    let emailTemplate: JSDOM;
    if (success) {
        emailTemplate = new JSDOM(await loadTemplate("./src/templates/email/success.html"));
    } else {
        emailTemplate = new JSDOM(await loadTemplate("./src/templates/email/failure.html"));
    }
    const document = emailTemplate.window.document;

    // Add email css
    const emailStyle = document.createElement("style");
    emailStyle.textContent = fs.readFileSync("./src/templates/email/email.css", "utf-8");
    emailStyle.media = "all"
    document.head.appendChild(emailStyle);

    const nameElement = document.querySelector("#name");
    const idElement = document.querySelector("#id");
    const dateElement = document.querySelector("#date");
    const headerDateElement = document.querySelector("#p-date");
    const productsElement = document.querySelector("#product-header");
    const totalElement = document.querySelector("#total");
    if (!nameElement || !idElement || !dateElement || !headerDateElement || !productsElement || !totalElement) {
        console.error("One or more required elements are missing in the email template.");
        return;
    }
    const date = new Date().toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const orderId = paymentIntent.id;
    const total = formatPrice(paymentIntent.amount_received, true);
    const shipping = formatPrice(Number(paymentIntent.metadata.shipping), true);
    const customerName: string = paymentIntent.shipping?.name || "Customer";

    nameElement.textContent = `Hi ${customerName},`;
    idElement.textContent = `Order ID: ${orderId}`;
    dateElement.textContent = `Date: ${date}`;
    headerDateElement.textContent = `Date: ${date}`;

    const productTable = document.querySelector("#products"); // this is the <table>
    const totalRow = totalElement.closest("tr");
    if (!productTable || !totalRow) {
        console.error("Could not find products table or total row");
        return;
    }

    for (const [productId, { quantity, price }] of Object.entries(products)) {
        const productLine = document.createElement("tr");

        const productName = createCell(document, productId, "60%", "purchase_item purchase_i");
        const productQuantity = createCell(document, quantity.toString(), "20%", "align-center purchase_i");
        const productPrice = createCell(document, formatPrice(price, true), "20%", "align-right purchase_i");

        productLine.appendChild(productName);
        productLine.appendChild(productQuantity);
        productLine.appendChild(productPrice);

        // Insert *above* the total row
        totalRow.parentElement!.insertBefore(productLine, totalRow);
    }
    // If shipping is defined, add a shipping row
    if (shipping) {
        const shippingRow = document.createElement("tr");
        const shippingName = createCell(document, "Shipping", "60%", "purchase_item purchase_i");
        const shippingQuantity = createCell(document, "", "20%", "align-center purchase_i");
        const shippingPrice = createCell(document, shipping, "20%", "align-right purchase_i");
        shippingRow.appendChild(shippingName);
        shippingRow.appendChild(shippingQuantity);
        shippingRow.appendChild(shippingPrice);
        // Insert the shipping row above the total row
        totalRow.parentElement!.insertBefore(shippingRow, totalRow);
    }
    if (totalElement) {
        totalElement.textContent = total;
    }
    const htmlContent = document.documentElement.outerHTML;
    // Inline CSS styles using juice
    const juicedContent = juice(htmlContent)
    return sendEmail(to, subject, juicedContent, [
        {
            filename: "logo.svg",
            path: "./src/images/logo-full.svg",
            cid: "logo@robox",
        }
    ]);
}
function processPaymentIntent (paymentIntent: Stripe.PaymentIntent, verifiedProducts: Record<string, Product>): [string, ProductEmail] {
    const metadata = paymentIntent.metadata;
    const products: Record<string, number> = JSON.parse(metadata.products || '{}');
    const emailProducts: ProductEmail = {};
    for (const [productId, quantity] of Object.entries(products)) {
        const product = verifiedProducts[productId];
        emailProducts[product.name] = {
            quantity: quantity,
            price: product.price,
        };
    }
    return [paymentIntent.receipt_email ?? "", emailProducts];
}
function createCell(document: Document, text: string, width: string, className: string): HTMLTableCellElement {
    const td = document.createElement("td");
    td.setAttribute("width", width);
    td.setAttribute("class", className);
    const span = document.createElement("span");
    span.setAttribute("class", "f-fallback");
    span.textContent = text;
    td.appendChild(span);
    return td;
}

async function sendEmail(to: string, subject: string, content: string, attachments: attachments): Promise<void> {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: content,
            attachments: attachments || [],
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