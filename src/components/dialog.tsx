import { openModal } from "../stores/modals";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, type HTMLAttributes } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";

export function Dialog({
    id,
    children,
    className,
}: HTMLAttributes<HTMLDialogElement>) {
    const ref = useRef<HTMLDialogElement>(null);
    const activeModal = useStore(openModal);

    // Open / close control
    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        if (activeModal === id) {
            if (!el.open) el.showModal();
        } else {
            if (el.open) el.close();
        }
    }, [activeModal, id]);

    // Backdrop + close syncing
    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const handleCancel = (event: Event) => {
            event.preventDefault();
            openModal.set(null);
        };

        const handleClose = () => {
            openModal.set(null);
        };

        const handleClick = (event: MouseEvent) => {
            if (event.target === el) {
                openModal.set(null);
            }
        };

        el.addEventListener("cancel", handleCancel);
        el.addEventListener("close", handleClose);
        el.addEventListener("click", handleClick);

        return () => {
            el.removeEventListener("cancel", handleCancel);
            el.removeEventListener("close", handleClose);
            el.removeEventListener("click", handleClick);
        };
    }, []);

    return (
        <dialog
            ref={ref}
            className={clsx(
                "fixed open:flex flex-col top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
                "w-full max-w-full sm:max-w-lg",
                "rounded-lg shadow-lg bg-white",
                "open:zoom-in-95 open:duration-200",
                className
            )}
            id={id}
        >
            {children}
            <button
                onClick={() => openModal.set(null)}
                className="absolute top-3.5 right-4 rounded-sm transition-opacity hover:cursor-pointer flex items-center justify-center py-1 px-0.5"
            >
                <FontAwesomeIcon icon={faXmark} className="size-4 text-red-500" />
                <span className="sr-only">Close</span>
            </button>
        </dialog>
    );
}
export function DialogHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={clsx("border-b border-gray-300 flex items-center text-lg font-semibold px-6 py-3 pr-12", className)} {...props}>
            {children}
        </div>
    )
}

export function DialogFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={clsx("border-t border-gray-300 gap-4 px-6 py-4 flex", className)} {...props}>
            {children}
        </div>
    )
}
export function DialogBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
         <div className={clsx("relative gap-4 flex-1 overflow-auto", className)} {...props}>
            {children}
        </div>
    )
}