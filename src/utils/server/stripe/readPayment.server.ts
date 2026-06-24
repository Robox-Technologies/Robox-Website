import { Stripe } from "stripe";
type PaymentType = {
    // Type/Brand/Bank
    name: string | null | undefined,

    // Email/User
    userID?: string | null | undefined,
    
    // ••••XXXX
    last4?: string | null | undefined,

    // MM/YY
    exp_month?: number | undefined,
    exp_year?: number | undefined,
}
export function readPaymentMethod(paymentMethod: Stripe.PaymentMethod): PaymentType {
    let paymentType: PaymentType;

    switch (paymentMethod.type) {
        case "acss_debit":
            paymentType = {
                name: paymentMethod.acss_debit?.bank_name,
                last4: paymentMethod.acss_debit?.last4
            }
            break;
        case "us_bank_account":
            paymentType = {
                name: paymentMethod.us_bank_account?.bank_name,
                last4: paymentMethod.us_bank_account?.last4
            }
            break;
        case "kr_card":
            paymentType = {
                name: paymentMethod.kr_card?.brand,
                last4: paymentMethod.kr_card?.last4
            }
            break;
        case "nz_bank_account":
            paymentType = {
                name: paymentMethod.nz_bank_account?.bank_name,
                userID: paymentMethod.nz_bank_account?.account_holder_name,
                last4: paymentMethod.nz_bank_account?.last4
            }
            break;

        case "au_becs_debit":
            paymentType = {
                name: "BECS Direct Debit",
                last4: paymentMethod.au_becs_debit?.last4
            }
            break;
        case "bacs_debit":
            paymentType = {
                name: "Bacs Direct Debit",
                last4: paymentMethod.bacs_debit?.last4
            }
            break;
        case "sepa_debit":
            paymentType = {
                name: "SEPA Direct Debit",
                last4: paymentMethod.sepa_debit?.last4
            }
            break;

        case "card":
            paymentType = {
                name: paymentMethod.card?.brand,
                last4: paymentMethod.card?.last4,
                exp_month: paymentMethod.card?.exp_month,
                exp_year: paymentMethod.card?.exp_year,
            }
            break;
        case "card_present":
            paymentType = {
                name: paymentMethod.card_present?.brand,
                last4: paymentMethod.card_present?.last4,
                exp_month: paymentMethod.card_present?.exp_month,
                exp_year: paymentMethod.card_present?.exp_year,
            }
            break;
        case "interac_present":
            paymentType = {
                name: paymentMethod.interac_present?.brand,
                last4: paymentMethod.interac_present?.last4,
                exp_month: paymentMethod.interac_present?.exp_month,
                exp_year: paymentMethod.interac_present?.exp_year,
            }
            break;

        case "boleto":
            paymentType = {
                name: "Boleto",
                userID: paymentMethod.boleto?.tax_id
            }
            break;
        case "cashapp":
            paymentType = {
                name: "Cash App",
                userID: paymentMethod.cashapp?.cashtag
            }
            break;
        case "link":
            paymentType = {
                name: "Link",
                userID: paymentMethod.link?.email
            }
            break;
        case "paypal":
            paymentType = {
                name: "PayPal",
                userID: paymentMethod.paypal?.payer_email
            }
            break;

        case "eps":
            paymentType = {
                name: paymentMethod.eps?.bank
            }
            break;
        case "fpx":
            paymentType = {
                name: paymentMethod.fpx?.bank
            }
            break;
        case "ideal":
            paymentType = {
                name: paymentMethod.ideal?.bank
            }
            break;
        case "p24":
            paymentType = {
                name: paymentMethod.p24?.bank
            }
            break;
        
        default:
            // Just show paymentMethod.type
            paymentType = {
                name: paymentMethod.type
            }
            break;
    }

    return paymentType
}