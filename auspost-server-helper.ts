import axios from "axios";
import { Fees } from "~types/fees";
import fees from "./src/fees.json" with { type: "json" };

const feesObject: Fees = typeof fees == "string" ? JSON.parse(fees) : fees;
const packagingInfo = feesObject.packaging;

const domesticCountryCode = "AU";
const auspostBaseURL = "https://digitalapi.auspost.com.au";

const requestHeaders = {
    "auth-key" : process.env.AUSPOST_KEY
}

// Standard AusPost services
const domesticStandardService = "AUS_PARCEL_REGULAR";
const intlStandardService = "INT_PARCEL_STD_OWN_PACKAGING";

export async function calculatePostage(country: string, postcode: string, unitVolume: number, weight: number): Promise<number> {
    const weightKg = weight / 1000;
    let auspostData: string | object;

    const packaging = calculateParcelSize(unitVolume);

    if (country === domesticCountryCode) {
        // Calculate domestic shipping
        const response = await axios.request({
            url: "/postage/parcel/international/calculate",
            baseURL: auspostBaseURL,
            headers: requestHeaders,

            params: {
                "from_postcode" : process.env.AUSPOST_ORIGIN_POSTCODE,
                "to_postcode" : postcode,
                "length" : packaging.length,
                "width" : packaging.width,
                "height" : packaging.height,
                "weight" : weightKg,
                "service_code" : domesticStandardService
            }
        });

        auspostData = response.data;
    } else {
        // Calculate intl. shipping
        const response = await axios.request({
            url: "/postage/parcel/international/calculate",
            baseURL: auspostBaseURL,
            headers: requestHeaders,

            params: {
                "country_code" : country,
                "weight" : weightKg,
                "service_code" : intlStandardService
            }
        });

        auspostData = response.data;
    }

    if (typeof auspostData === "string") {
        auspostData = JSON.parse(auspostData);
    }

    const auspostCost = (auspostData["postage_result"]["costs"]["cost"]["cost"] as number) * 100;
    return auspostCost + packaging.packagingCost;
}

function calculateParcelSize(unitVolume: number): { packagingCost: number, length: number, width: number, height: number } {
    let packageSpecs: { packagingCost: number, length: number, width: number, height: number };

    // Find smallest suitable packaging
    const suitablePackaging = packagingInfo.qtyBrackets.find((element) => unitVolume < element.maxQty);

    if (suitablePackaging) {
        packageSpecs = {
            packagingCost: suitablePackaging.cost,
            length: suitablePackaging.dimensions.length,
            width: suitablePackaging.dimensions.width,
            height: suitablePackaging.dimensions.height
        }
    } else {
        // No matching packaging - use penalty costs
        const penaltyPackaging = packagingInfo.excessPenalty;
        
        // Add penalty per 10 to packaging height
        const excessHeight = penaltyPackaging.heightPerTen * (Math.ceil(unitVolume / 10) - 1);

        packageSpecs = {
            packagingCost: penaltyPackaging.cost,
            length: penaltyPackaging.dimensions.length,
            width: penaltyPackaging.dimensions.width,
            height: penaltyPackaging.dimensions.height + excessHeight
        }
    }

    return packageSpecs;
}