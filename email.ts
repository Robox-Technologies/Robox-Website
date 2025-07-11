import { createTransport } from "nodemailer";
import fs from "fs";
import { JSDOM } from "jsdom";
import { Stripe } from "stripe";
import juice from "juice";
import { Product } from './types/api';
import { formatPrice } from './src/root/stripe-shared-helper.js';
import iso3311a2 from 'iso-3166-1-alpha-2';
import { stripeAPI, readPaymentMethod } from './stripe-server-helper.js';

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

// Filename and ID of partials to use
const partialNames = [
    "summary",
    "metadata",
    "masthead",
    "footer"
]

const partialDOMs = Object.fromEntries(partialNames.map((name) => {
    const partialXmlString = fs.readFileSync(`./src/templates/email/partials/${name}.html`, "utf-8");
    const partialDOM = new JSDOM(partialXmlString).window.document.body.childNodes
    return [name, Array.from(partialDOM) as Node[]];
}));

export async function processEmail(paymentIntent: Stripe.PaymentIntent, verifiedProducts: Record<string, Product>, success: boolean): Promise<void> {
    const [to, products] = processPaymentIntent(paymentIntent, verifiedProducts);

    // Fetch email template
    const templateName = success ? "success" : "failure";
    const emailTemplate = new JSDOM(await loadTemplate(`./src/templates/email/${templateName}.html`));
    const document = emailTemplate.window.document;

    // Inject css
    const emailStyle = document.createElement("style");
    emailStyle.textContent = fs.readFileSync("./src/templates/email/nunitoFont.css", "utf-8");
    emailStyle.textContent += fs.readFileSync("./src/templates/email/email.css", "utf-8");
    emailStyle.media = "all"
    document.head.appendChild(emailStyle);

    // Inject partials
    for (const partialName of partialNames) {
        try {
            const partialMarker = document.getElementById(partialName);
            let partialDOM = partialDOMs[partialName];
            if (!partialMarker || !partialDOM) continue;
            
            // Clone elements
            partialDOM = partialDOM.map((child) => child.cloneNode(true));
            
            partialMarker.replaceWith(...partialDOM);
        } catch (error) {
            console.error(`Error injecting partial '${partialName}' in email: `, error);
        }
    }

    // Inject images
    const images = document.querySelectorAll("img");
    for (const image of images) {
        image.src = `https://robox.com.au/public/email/${image.src}`;
    }

    // Populate templated fields
    // We use classes instead of IDs to allow for duplicate fields to be populated.
    const nameElements = document.querySelectorAll(".name");
    const idElements = document.querySelectorAll(".id");
    const dateElements = document.querySelectorAll(".date");
    const totalElements = document.querySelectorAll(".total");

    const date = new Date().toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const orderId = paymentIntent.id;
    const total = formatPrice(paymentIntent.amount, true);
    const customerName = paymentIntent.shipping?.name || "Customer";

    nameElements.forEach((nameElement) => {
        nameElement.textContent = customerName;
    });

    idElements.forEach((idElement) => {
        idElement.textContent = orderId;
    });

    totalElements.forEach((totalElement) => {
        totalElement.textContent = total;
    });
    
    dateElements.forEach((dateElement) => {
        dateElement.textContent = date;
    });

    // Address and billing info
    const [address, billing] = await populateBilling(document, paymentIntent)

    // Fetch table and product row, if it exists
    const shipping = formatPrice(Number(paymentIntent.metadata.shipping), true);
    populateProductTable(document, shipping, products);

    // Capture body inside table
    const containerTable = document.createElement("table");
    const containerRow = document.createElement("tr");
    const containerCell = document.createElement("td");
    const container = document.createElement("div");
    containerCell.setAttribute("align", "center");
    container.classList.add("email-container");

    container.append(...document.body.children);
    containerCell.appendChild(container);
    containerRow.appendChild(containerCell);
    containerTable.appendChild(containerRow);
    document.body.replaceChildren(containerTable);

    // Create plaintext fallback
    const plaintext = generateTxtEmail(templateName, orderId, date, total, customerName, shipping, products, address, billing);

    // Inline CSS styles using juice
    const juicedContent = juice(document.documentElement.outerHTML, {
        preserveImportant: true
    });
    
    return sendEmail(to, document.title, juicedContent, plaintext);
}

function generateTxtEmail(templateName: string, orderId: string, date: string, total: string, customerName: string, shipping: string, products: ProductEmail, address: string, billing: string): string {
    let plaintext = fs.readFileSync(`./src/templates/email/${templateName}.txt`, "utf-8");

    const summary = fs.readFileSync(`./src/templates/email/partials/summary.txt`, "utf-8");
    const signature = fs.readFileSync(`./src/templates/email/partials/signature.txt`, "utf-8");
    plaintext = plaintext.replaceAll("{{summary}}", summary);
    plaintext = plaintext.replaceAll("{{signature}}", signature);

    plaintext = plaintext.replaceAll("{{name}}", customerName);
    plaintext = plaintext.replaceAll("{{order_id}}", orderId);
    plaintext = plaintext.replaceAll("{{date}}", date);

    plaintext = plaintext.replaceAll("{{total}}", total);
    plaintext = plaintext.replaceAll("{{shipping}}", shipping);
    plaintext = plaintext.replaceAll("{{address}}", address.replaceAll("<br>", "\n"));
    plaintext = plaintext.replaceAll("{{billing}}", billing.replaceAll("<br>", "\n"));

    const productEntries = Object.entries(products);
    const lastProduct = productEntries[productEntries.length-1][0];

    let items = "";
    for (const [productId, { quantity, price }] of productEntries) {
        const isLastProduct = productId == lastProduct;
        items += `${productId} × ${quantity}: ${formatPrice(price, true)}${isLastProduct ? "" : "\n"}`;
    }
    plaintext = plaintext.replaceAll("{{items}}", items);
    
    return plaintext
}

function processPaymentIntent (paymentIntent: Stripe.PaymentIntent, verifiedProducts: Record<string, Product>): [string, ProductEmail] {
    const metadata = paymentIntent.metadata;
    const products: Record<string, number> = JSON.parse(metadata.products || '{}');
    const emailProducts: ProductEmail = {};
    for (const [productId, quantity] of Object.entries(products)) {
        const product = verifiedProducts[productId];
        emailProducts[product.name] = {
            quantity: quantity,
            price: product.price * quantity,
        };
    }
    return [paymentIntent.receipt_email ?? "", emailProducts];
}

function populateProductTable(document: Document, shipping: string, products: ProductEmail) {
    const productTable = document.getElementById("products");
    const totalRow = document.getElementById("total-row");

    if (!productTable || !totalRow) {
        console.error("Could not find products table or total row");
        return;
    }

    // Product rows
    for (const [productId, { quantity, price }] of Object.entries(products)) {
        const productLine = document.createElement("tr");

        const productName = createCell(document, productId, "purchase_item large");
        const productQuantity = createCell(document, quantity.toString(), "align-center small");
        const productPrice = createCell(document, formatPrice(price, true), "align-right small");

        productLine.appendChild(productName);
        productLine.appendChild(productQuantity);
        productLine.appendChild(productPrice);

        // Insert above the total row
        totalRow.parentElement!.insertBefore(productLine, totalRow);
    }

    // If shipping is defined, add a shipping row
    if (shipping) {
        const shippingRow = document.createElement("tr");
        const shippingName = createCell(document, "Shipping", "shipping purchase_item row-separate large");
        const shippingQuantity = createCell(document, "", "shipping align-center row-separate small");
        const shippingPrice = createCell(document, shipping, "shipping align-right row-separate small");

        shippingRow.appendChild(shippingName);
        shippingRow.appendChild(shippingQuantity);
        shippingRow.appendChild(shippingPrice);

        // Insert above the total row
        totalRow.parentElement!.insertBefore(shippingRow, totalRow);
    }
}

function createCell(document: Document, text: string, className: string): HTMLTableCellElement {
    const td = document.createElement("td");
    td.setAttribute("class", className);

    const pText = document.createElement("p");
    pText.textContent = text;
    td.appendChild(pText);

    return td;
}

async function sendEmail(to: string, subject: string, content: string, plaintext?: string, attachments?: attachments): Promise<void> {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: plaintext ?? "",
            html: content,
            attachments: attachments ?? [],
        });

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

async function populateBilling(document: Document, paymentIntent: Stripe.PaymentIntent): Promise<[string, string]> {
    // Billing
    const address = paymentIntent.shipping?.address;
    const addressEl = document.getElementById("address") as HTMLParagraphElement;

    let addressText = "";
    if (address && addressEl) {
        // Unit/Street
        if (address.line1) addressText += `${address.line1}<br>`;
        if (address.line2) addressText += `${address.line2}<br>`;

        // City/State/Post code
        if (address.city || address.state || address.postal_code) {
            if (address.city) addressText += `${address.city} `;
            if (address.state) addressText += `${address.state} `;
            if (address.postal_code) addressText += address.postal_code;

            addressText += "<br>";
        }
        
        // Country
        if (address.country) addressText += iso3311a2.getCountry(address.country);

        addressEl.innerHTML = addressText;
    }

    // Address
    let billingText = "";
    const billingEl = document.getElementById("billing") as HTMLParagraphElement;
    const stripePaymentData = paymentIntent.payment_method ?? paymentIntent.last_payment_error.payment_method;

    if (billingEl && stripePaymentData) {
        let paymentMethod: Stripe.PaymentMethod | undefined = undefined;
        
        if (typeof stripePaymentData === "string") {
            paymentMethod = await stripeAPI.paymentMethods.retrieve(stripePaymentData);
        } else {
            paymentMethod = stripePaymentData;
        }
        
        if (paymentMethod && billingEl) {
            const paymentType = readPaymentMethod(paymentMethod);
    
            if (paymentType.name) billingText += `${titleCase(paymentType.name)}<br>`;
            if (paymentType.userID) billingText += `${titleCase(paymentType.userID)}<br>`;
            if (paymentType.last4) billingText += `Ending in ••••${paymentType.last4}<br>`;
            if (paymentType.exp_month && paymentType.exp_year) billingText += `Expires on ${paymentType.exp_month}/${paymentType.exp_year % 1000}`;
    
            billingEl.innerHTML = billingText;
        }
    }

    return [addressText, billingText];
}

function titleCase(str: string): string {
    const splitStr = str.toLowerCase().split(' ');
    for (let i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    
    return splitStr.join(' '); 
 }