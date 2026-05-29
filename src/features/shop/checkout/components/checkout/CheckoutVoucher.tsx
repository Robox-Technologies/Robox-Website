export default function CheckoutVoucher() {
    return (
        <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-gray-50 p-4">
            <label
                htmlFor="voucher-code"
                className="text-sm font-semibold text-black"
            >
                Voucher code
            </label>
            <div className="flex gap-3">
                <input
                    id="voucher-code"
                    type="text"
                    placeholder="Enter code"
                    className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-4 py-3 text-base text-black outline-none placeholder:text-gray-400"
                    disabled
                />
                <button
                    type="button"
                    className="rounded-lg bg-red px-5 py-3 text-base font-semibold text-white opacity-80"
                    disabled
                >
                    Apply
                </button>
            </div>
            <p className="mb-0 text-sm text-gray-600">
                Voucher support will be wired in later.
            </p>
        </div>
    )
}