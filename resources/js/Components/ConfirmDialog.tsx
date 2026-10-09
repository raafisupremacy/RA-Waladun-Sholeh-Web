import React from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Konfirmasi',
    onCancel,
    onConfirm,
    busy = false,
    danger = false,
}: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    onCancel: () => void;
    onConfirm: () => void;
    busy?: boolean;
    danger?: boolean;
}) {
    React.useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, busy, onCancel]);

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={() => !busy && onCancel()}
        >
            <div
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-6 text-left border border-stone-100 animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100dvh-32px)] flex flex-col overflow-y-auto overscroll-contain my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-dialog-title" className="text-2xl font-bold text-stone-900 tracking-tight">
                    {title}
                </h2>
                <div className="text-sm text-stone-600 leading-relaxed">
                    {description}
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`px-6 py-2.5 rounded-full text-white text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 ${
                            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0071E3] hover:bg-[#0077ED]'
                        }`}
                    >
                        {busy ? 'Memproses…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
