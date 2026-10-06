import { ReactNode } from 'react';
export default function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
    return <div className="form-field"><label htmlFor={id}>{label}</label>{children}{error && <p id={id + '-error'} className="field-error" role="alert">{error}</p>}</div>;
}
