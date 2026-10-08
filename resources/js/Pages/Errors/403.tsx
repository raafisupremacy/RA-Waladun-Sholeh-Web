import { Head, Link } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Forbidden() { return <GuestLayout><Head title="Akses ditolak" /><main className="error-page"><p className="eyebrow">403</p><h1>Akses ditolak</h1><p>Anda tidak memiliki izin untuk membuka halaman ini.</p><Link className="button-primary" href="/">Kembali</Link></main></GuestLayout>; }
