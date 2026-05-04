export type ToastVariant = 'danger' | 'warning' | 'informative' | 'success'

export type Toast = {
    id: string
    variant: ToastVariant
    message: string
    title?: string
    durationMs: number
    dismissible: boolean
}

export type ToastInput = {
    message: string
    title?: string
    durationMs?: number
    dismissible?: boolean
}

type ToastEventMap = {
    change: Toast[]
}

type ToastListener<K extends keyof ToastEventMap> = (
    payload: ToastEventMap[K],
) => void

type AnyToastListener = ToastListener<'change'>

class ToastManager {
    private toasts: Toast[] = []
    private listeners: Map<keyof ToastEventMap, Set<AnyToastListener>> =
        new Map()

    getToasts(): Toast[] {
        return [...this.toasts]
    }

    on<K extends keyof ToastEventMap>(
        event: K,
        listener: ToastListener<K>,
    ): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }

        this.listeners.get(event)!.add(listener)
    }

    off<K extends keyof ToastEventMap>(
        event: K,
        listener: ToastListener<K>,
    ): void {
        this.listeners.get(event)?.delete(listener)
    }

    private emit<K extends keyof ToastEventMap>(
        event: K,
        payload: ToastEventMap[K],
    ): void {
        this.listeners.get(event)?.forEach((listener) => listener(payload))
    }

    private notify(): void {
        this.emit('change', this.getToasts())
    }

    push(variant: ToastVariant, input: ToastInput): string {
        const toast: Toast = {
            id: crypto.randomUUID(),
            variant,
            message: input.message,
            title: input.title,
            durationMs: input.durationMs ?? 5000,
            dismissible: input.dismissible ?? true,
        }

        this.toasts = [toast, ...this.toasts]
        this.notify()
        return toast.id
    }

    dismiss(id: string): void {
        const nextToasts = this.toasts.filter((toast) => toast.id !== id)
        if (nextToasts.length === this.toasts.length) {
            return
        }

        this.toasts = nextToasts
        this.notify()
    }

    clear(): void {
        if (this.toasts.length === 0) {
            return
        }

        this.toasts = []
        this.notify()
    }

    success(input: ToastInput): string {
        return this.push('success', input)
    }

    informative(input: ToastInput): string {
        return this.push('informative', input)
    }

    warning(input: ToastInput): string {
        return this.push('warning', input)
    }

    danger(input: ToastInput): string {
        return this.push('danger', input)
    }
}

export const toast = new ToastManager()
