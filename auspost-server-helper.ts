export async function calculatePostage(country: string, postcode: string, dimensions: { length: number, width: number, height: number }, weight: number) {
    if (country === "AU") {
        // Calculate domestic shipping
    } else {
        // Calculate intl. shipping
    }
}