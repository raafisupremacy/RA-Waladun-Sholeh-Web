import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import ConfirmDialog from '@/Components/ConfirmDialog';

type Student = {
    id: number; name: string; nis: string; birth_date?: string | null; gender?: string | null; status: string;
    guardians: { name: string; phone?: string; email?: string; relationship?: string }[];
    enrollments: { id: number; classroom?: string; academic_year?: string; status: string }[];
    invoices: { id: number; invoice_number: string; period_month: number; period_year: number; amount: number; status: string }[];
};

const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export default function StudentShow({ student }: { student: Student }) {
    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    return (
        <>
            <Head title={`Lihat ${student.name}`} />
            <div className="flex items-start justify-between gap-4 mb-8">
                <div><p className="text-sm text-stone-500">Data siswa</p><h1 className="text-4xl font-semibold text-stone-900">{student.name}</h1><p className="text-stone-500 mt-1">NIS {student.nis}</p></div>
                <div className="flex gap-2"><Link href={`/admin/siswa?search=${encodeURIComponent(student.nis)}&edit=${student.id}`} className="button-secondary">Ubah</Link>{student.status === 'aktif' && <button type="button" onClick={() => setDeactivateOpen(true)} className="button-danger">Nonaktifkan</button>}<Link href="/admin/siswa" className="button-secondary">Kembali</Link></div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <section className="tile"><h2 className="text-xl font-semibold mb-4">Identitas</h2><dl className="space-y-3"><div><dt className="text-sm text-stone-500">Tanggal lahir</dt><dd>{student.birth_date ?? '—'}</dd></div><div><dt className="text-sm text-stone-500">Jenis kelamin</dt><dd>{student.gender ?? '—'}</dd></div><div><dt className="text-sm text-stone-500">Status</dt><dd><StatusCapsule status={student.status} /></dd></div></dl></section>
                <section className="tile"><h2 className="text-xl font-semibold mb-4">Orang tua</h2>{student.guardians.length ? student.guardians.map((guardian) => <div key={`${guardian.name}-${guardian.email}`} className="py-2 border-b border-stone-100 last:border-0"><p className="font-semibold">{guardian.name}</p><p className="text-sm text-stone-500">{guardian.relationship ?? 'Wali'} · {guardian.phone ?? '—'} · {guardian.email ?? '—'}</p></div>) : <p className="text-stone-500">Belum ada orang tua terhubung.</p>}</section>
                <section className="tile"><h2 className="text-xl font-semibold mb-4">Kelas dan riwayat</h2>{student.enrollments.map((enrollment) => <div key={enrollment.id} className="flex justify-between py-2 border-b border-stone-100 last:border-0"><span>{enrollment.classroom ?? 'Belum ada kelas'} · {enrollment.academic_year ?? '—'}</span><StatusCapsule status={enrollment.status} /></div>)}</section>
                <section className="tile"><h2 className="text-xl font-semibold mb-4">Ringkasan tagihan</h2>{student.invoices.length ? student.invoices.map((invoice) => <div key={invoice.id} className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0"><span>{invoice.invoice_number}<br /><small>{invoice.period_month}/{invoice.period_year}</small></span><span className="text-right">{rupiah(invoice.amount)}<br /><StatusCapsule status={invoice.status} /></span></div>) : <p className="text-stone-500">Belum ada tagihan.</p>}</section>
            </div>
            <ConfirmDialog
                open={deactivateOpen}
                title={`Nonaktifkan ${student.name}?`}
                description="Siswa tidak akan menerima tagihan baru. Riwayat data tetap tersimpan."
                confirmLabel="Nonaktifkan"
                danger
                busy={busy}
                onCancel={() => setDeactivateOpen(false)}
                onConfirm={() => { setBusy(true); router.post(`/admin/siswa/${student.id}/nonaktifkan`, {}, { onFinish: () => setBusy(false), onSuccess: () => setDeactivateOpen(false) }); }}
            />
        </>
    );
}

StudentShow.layout = getAdminLayout;
