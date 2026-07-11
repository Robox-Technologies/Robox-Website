export default function CheckoutVoucher() {
    return (
        <div className="flex flex-col gap-3 mt-auto">
            <div className="flex gap-3">
                <label
                    htmlFor="voucher-code"
                    className="text-md font-medium text-black"
                >
                    Voucher Code
                </label>
            </div>
            <div className="flex gap-3">
                <input
                    id="voucher-code"
                    type="text"
                    placeholder="Enter Voucher"
                    className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-4 py-3 text-base text-black outline-none placeholder:text-gray-400"
                />
                <button
                    type="button"
                    className="rounded-lg bg-red px-5 py-3 text-base font-semibold text-white"
                >
                    Apply
                </button>
            </div>
        </div>
    )
}