import Button from "@components/button";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import clsx from "clsx";
import { useState } from "react";
import type { FormHTMLAttributes } from "react";
export default function AddQuantity({className, ...props}: FormHTMLAttributes<HTMLFormElement>) {
    const [quantity, setQuantity] = useState(0);
    const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuantity(Math.abs(parseInt(e.target.value) || 0));
    }
    const increment = () => {        
        setQuantity(prev => prev + 1);
    }
    const decrement = () => {
        setQuantity(prev => Math.max(0, prev - 1));
    }
    return (
        <form {...props} className={clsx(className, `flex flex-row items-center gap-0 w-64`)}>
            <Button type="button" icon={faMinus} iconStyle="text-black" className="rounded-l-full! border-2 p-0! w-10 border-black flex items-center justify-center h-10" onClick={decrement} />
            <input type="number" className="w-26 text-center border-y-2 border-black h-10 no-spinner" value={quantity.toString()} min={0} onChange={onChangeHandler} />
            <Button type="button" icon={faPlus} iconStyle="text-black" className="rounded-r-full! border-2 border-black p-0! w-10 flex text-center items-center justify-center h-10" onClick={increment} />
        </form>
    )
}
