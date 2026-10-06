import { useEffect, useRef, useId } from 'react';
export default function BottomSheet({ open, title, onClose, children, drawer = false }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; drawer?: boolean }) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    useEffect(() => {
        if (open && !ref.current?.open) ref.current?.showModal();
        if (!open && ref.current?.open) ref.current?.close();
    }, [open]);
    return <dialog ref={ref} className={drawer ? 'native-sheet native-drawer' : 'native-sheet'} aria-labelledby={titleId} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        <div className="sheet-content"><div className="sheet-heading"><h2 id={titleId}>{title}</h2><button className="button-secondary" type="button" onClick={onClose}>Tutup</button></div>{open && children}</div>
    </dialog>;
}
