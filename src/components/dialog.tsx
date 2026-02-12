import { openModal } from "../stores/modals";
import { useStore } from "@nanostores/react";
import { useEffect, useRef } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";

export function Dialog({
    id,
    children,
    className,
}: {
    id: string;
    children: React.ReactNode;
    className?: string;
}) {
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
                "h-150",
                "rounded-t-lg shadow-lg bg-white",
                "open:zoom-in-95 open:duration-200",
                className
            )}
        >
            {children}
            <button
                onClick={() => openModal.set(null)}
                className="absolute top-4 right-6 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
                <FontAwesomeIcon icon={faXmark} className="size-4" />
                <span className="sr-only">Close</span>
            </button>
        </dialog>
    );
}
export function DialogHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="border-b flex items-center text-lg font-semibold px-6 py-3 pr-12">
            {children}
        </div>
    )
}
export function DialogBody({ children }: { children: React.ReactNode }) {
    return (
         <div className="relative grid gap-4 p-6 bg-gray-100 flex-1 overflow-auto">
            {children}
        </div>
    )
}