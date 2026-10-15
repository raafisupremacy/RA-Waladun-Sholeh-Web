import { Head, Link, usePage } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function SessionExpired({ message }: { message?: string }) {
    const phone = (usePage().props as { schoolSettings?: Record<string, string> }).schoolSettings?.school_phone || '';

    return <GuestLayout><Head title="Sesi berakhir" /><main className="error-page"><p className="eyebrow">419</p><h1>Sesi Anda berakhir</h1><p>{message || 'Sesi Anda berakhir. Muat ulang halaman lalu coba lagi.'}</p><button className="button-primary" type="button" onClick={() => window.location.reload()}>Muat ulang</button>{phone && <p className="help-copy">Butuh bantuan? <a href={`tel:${phone}`}>Hubungi Tata Usaha</a></p>}<Link className="button-secondary" href="/">Kembali</Link></main></GuestLayout>;
}
