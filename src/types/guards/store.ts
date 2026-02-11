import { type ProductStatus } from "src/types/store";
export function isValidStatus(status: string): status is ProductStatus {
    if (typeof status !== "string") return false;
    return ["available", "not-available", "preorder"].includes(status);
}