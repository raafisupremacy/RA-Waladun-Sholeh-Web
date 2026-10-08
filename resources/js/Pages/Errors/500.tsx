import { Head, Link } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function ServerError() { return <GuestLayout><Head title="Terjadi galat" /><main className="error-page"><p className="eyebrow">500</p><h1>Terjadi galat</h1><p>Halaman ini sedang bermasalah. Coba lagi beberapa saat lagi.</p><Link className="button-primary" href="/">Kembali</Link></main></GuestLayout>; }
