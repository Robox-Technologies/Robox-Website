import { openModal } from "../stores/modals";
import { useStore } from "@nanostores/react";
import { useEffect, useRef } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";

export function Modal({
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

    useEffect(() => {
        if (!ref.current) return;

        if (activeModal === id) {
            ref.current.showModal();
        } else {
            ref.current.close();
        }
    }, [activeModal, id]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onClose = () => openModal.set(null);

        const onClickOutside = (event: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            if (
                event.clientX < rect.left ||
                event.clientX > rect.right ||
                event.clientY < rect.top ||
                event.clientY > rect.bottom
            ) {
                openModal.set(null);
            }
        };

        el.addEventListener("close", onClose);
        el.addEventListener("click", onClickOutside);

        return () => {
            el.removeEventListener("close", onClose);
            el.removeEventListener("click", onClickOutside);
        };
    }, []);

    return (
        <dialog
            ref={ref}
            className={clsx(
                "fixed inset-0 z-50 bg-transparent p-0",
                className
            )}
        >
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50" />

            {/* Content */}
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-6 shadow-lg">
                {children}

                {/* Close button */}
                <button
                    onClick={() => openModal.set(null)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 transition hover:opacity-100 focus:outline-none"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </dialog>
    );
}
