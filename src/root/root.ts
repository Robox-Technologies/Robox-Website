import { refreshCart } from "./payment/cart";
import { library, dom } from '@fortawesome/fontawesome-svg-core';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons/faShoppingCart';
library.add(faTrash, faShoppingCart);
dom.watch(); // Replaces <i> tags with SVGs
refreshCart()

