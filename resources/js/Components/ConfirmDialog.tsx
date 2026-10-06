import BottomSheet from './BottomSheet';
export default function ConfirmDialog({ open, title, description, confirmLabel = 'Konfirmasi', onCancel, onConfirm, busy = false }: { open: boolean; title: string; description: string; confirmLabel?: string; onCancel: () => void; onConfirm: () => void; busy?: boolean }) {
    return <BottomSheet open={open} title={title} onClose={onCancel}><p>{description}</p><div className="dialog-actions"><button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>Batal</button><button type="button" className="button-primary" onClick={onConfirm} disabled={busy}>{busy ? 'Memproses…' : confirmLabel}</button></div></BottomSheet>;
}
