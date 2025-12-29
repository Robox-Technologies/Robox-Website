
import fs from "fs";
import { JSDOM } from "jsdom";
import { Stripe } from "stripe";
import juice from "juice";
import { Product } from '~types/api.js';
import { formatPrice } from './src/root/payment/stripe-shared-helper.js';
import iso3311a2 from 'iso-3166-1-alpha-2';
import { stripeAPI, readPaymentMethod } from './stripe-server-helper.js';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_KEY || 're_...');

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

export async function sendAccountEmail(to: string, templateName: 'reset-password' | 'verify-email' | 'welcome' | 'account-deleted', options: { code?: string; magicLink?: string; name?: string } ): Promise<void> {
    // Fetch email template
    const emailTemplate = new JSDOM(await loadTemplate(`./src/templates/email/account/${templateName}/${templateName}.html`));
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

    const nameElements = document.querySelectorAll("#name");
    const magicLinkElements = document.querySelectorAll("#magic-link");
    const codeElements = document.querySelectorAll("#otp-code");

    nameElements.forEach((nameElement) => {
        if (options.name) {
            nameElement.textContent = options.name;
        }
    });

    magicLinkElements.forEach((magicLinkElement) => {
        if (
            magicLinkElement instanceof emailTemplate.window.HTMLAnchorElement &&
            options.magicLink
        ) {
            magicLinkElement.href = options.magicLink;
        }
    });

    codeElements.forEach((codeElement) => {
        if (options.code) {
            codeElement.textContent = options.code;
        }
    });

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
    let plaintext = fs.readFileSync(`./src/templates/email/account/${templateName}/${templateName}.txt`, "utf-8");
    const signature = fs.readFileSync(`./src/templates/email/partials/signature.txt`, "utf-8");
    plaintext = plaintext.replaceAll("{{signature}}", signature);
    if (options.code) plaintext = plaintext.replaceAll("{{code}}", options.code);
    if (options.magicLink) plaintext = plaintext.replaceAll("{{magic_link}}", options.magicLink);
    if (options.name) plaintext = plaintext.replaceAll("{{name}}", options.name);

    // Inline CSS styles using juice
    const juicedContent = juice(document.documentElement.outerHTML, {
        preserveImportant: true
    });
    
    return sendEmail(to, 'accounts', document.title, juicedContent, plaintext);
}

export async function processEmail(paymentIntent: Stripe.PaymentIntent, verifiedProducts: Record<string, Product>, success: boolean): Promise<void> {
    const [to, products] = processPaymentIntent(paymentIntent, verifiedProducts);

    // Fetch email template
    const templateName = success ? "success" : "failure";
    const emailTemplate = new JSDOM(await loadTemplate(`./src/templates/email/${templateName}/${templateName}.html`));
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

    const data = {id: orderId, date, total, name: customerName, shipping, products, address, billing};
    const plaintext = generateTxtEmail('payment', templateName, data);

    // Inline CSS styles using juice
    const juicedContent = juice(document.documentElement.outerHTML, {
        preserveImportant: true
    });
    
    return sendEmail(to, 'hello', document.title, juicedContent, plaintext);
}

function generateTxtEmail(type: string, templateName: string, data: Record<string, any>): string {
    // Try to read the template file, fallback to empty string if not found
    let plaintext = "";
    try {
        plaintext = fs.readFileSync(`./src/templates/email/${type}/${templateName}/${templateName}.txt`, "utf-8");
    } catch (e) {
        console.error(`Could not read template: ./src/templates/email/${type}/${templateName}/${templateName}.txt`, e);
        return "";
    }

    // Load partials if referenced in template
    const partials = ["summary", "signature"];
    for (const partial of partials) {
        if (plaintext.includes(`{{${partial}}}`)) {
            try {
                const partialContent = fs.readFileSync(`./src/templates/email/partials/${partial}.txt`, "utf-8");
                plaintext = plaintext.replaceAll(`{{${partial}}}`, partialContent);
            } catch (e) {
                console.error(`Could not read partial: ./src/templates/email/partials/${partial}.txt`, e);
                plaintext = plaintext.replaceAll(`{{${partial}}}`, "");
            }
        }
    }

    // Replace all keys in data
    for (const [key, value] of Object.entries(data)) {
        let replacement: string;
        if (key === "products" && typeof value === "object" && value !== null) {
            // Special handling for products
            const productEntries = Object.entries(value);
            if (productEntries.length) {
                const items = productEntries.map(([productId, { quantity, price }]: any) => {
                    return `${productId} × ${quantity}: ${formatPrice(price, true)}`;
                }).join("\n");
                replacement = items;
            } else {
                replacement = "";
            }
        } else if (typeof value === "string") {
            // Replace <br> with newlines for address/billing/etc
            replacement = value.replaceAll?.("<br>", "\n") ?? value;
        } else {
            replacement = String(value);
        }
        plaintext = plaintext.replaceAll(`{{${key}}}`, replacement);
    }

    return plaintext;
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

async function sendEmail(to: string, from: string, subject: string, content: string, plaintext?: string, attachments?: attachments): Promise<void> {
    try {
        const response = await resend.emails.send({
            from: `Ro/Box <${from}@${process.env.EMAIL_DOMAIN || "resend.dev"}>`,
            to: [to],
            subject: subject,
            html: content,
            text: plaintext ?? "",
            attachments: attachments ?? [],
        });

        if (response.error) {
            console.error(`Resend API error:`, response.error);
            throw new Error(`Resend API error: ${response.error.message || response.error}`);
        }

        console.log(`Email sent successfully to ${to}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        throw error;
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
    const stripePaymentData = paymentIntent.payment_method ?? paymentIntent.last_payment_error?.payment_method;

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
            if (paymentType.userID) billingText += `${paymentType.userID}<br>`;
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