import Button from "@components/button";
import { faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import { cartItems } from '../utils/cart.client';
import { useStore } from "@nanostores/react";
export default function CartIcon() {
    const $cartItems = useStore(cartItems);
    const quantityInCart = Object.values($cartItems).reduce((acc, item) => acc + item.quantity, 0);
    return (
        <Button type="button" 
            icon={faShoppingCart} 
            iconStyle="text-black" 
            className={`relative rounded-full! border-2 p-0! w-10 border-black flex items-center justify-center h-10 ${quantityInCart > 0 ? 'ring-2 ring-red' : ''}`} 
        >
            {quantityInCart > 0 && <span className="absolute -top-1 -right-1 bg-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{quantityInCart}</span>}
        </Button>
    )
}
