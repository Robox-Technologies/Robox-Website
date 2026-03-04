import { useState, useRef, useEffect, type ComponentType, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import AddToCartButton from '@components/shop/product/addToCartButton';
import Dialog, { DialogHeader } from "@components/dialog";

export default function ProductCartModal() {
    

    return (
        <Dialog
            trigger={(setIsOpen) => <OpenElement setIsOpen={setIsOpen} />}
        >
            <DialogHeader>
                Product added to cart!
            </DialogHeader>
            <p className="p-6">The product has been successfully added to your cart.</p>
        </Dialog>

    );
}
function OpenElement({setIsOpen}: {setIsOpen: Dispatch<SetStateAction<boolean>>}) {
    return (
        <AddToCartButton setIsOpen={setIsOpen} />
    )
}
