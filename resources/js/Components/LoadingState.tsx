export default function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
    return <div className="loading-state" role="status" aria-live="polite" aria-busy="true"><span className="loading-dot" aria-hidden="true" />{label}</div>;
}
