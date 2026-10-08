import { Head, Link } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function NotFound() { return <GuestLayout><Head title="Halaman tidak ditemukan" /><main className="error-page"><p className="eyebrow">404</p><h1>Halaman tidak ditemukan</h1><p>Alamat yang dibuka tidak tersedia.</p><Link className="button-primary" href="/">Kembali</Link></main></GuestLayout>; }
