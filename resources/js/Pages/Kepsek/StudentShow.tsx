import { Head, Link } from '@inertiajs/react';
import { getPrincipalLayout } from '@/Layouts/PrincipalLayout';
import StatusCapsule from '@/Components/StatusCapsule';

type Student = { id: number; name: string; nis: string; birth_date?: string | null; gender?: string | null; status: string; guardians: { name: string; phone?: string; email?: string; relationship?: string }[]; enrollments: { id: number; classroom?: string; academic_year?: string; status: string }[]; invoices: { id: number; invoice_number: string; period_month: number; period_year: number; amount: number; status: string }[] };
const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export default function StudentShow({ student }: { student: Student }) {
    return <><Head title={`Siswa ${student.name}`} /><div className="mb-8"><p className="text-sm text-stone-500">Data siswa</p><h1 className="text-4xl font-semibold">{student.name}</h1><p className="text-stone-500">NIS {student.nis}</p></div><div className="grid gap-6 lg:grid-cols-2"><section className="tile"><h2 className="text-xl font-semibold mb-4">Identitas</h2><p>{student.birth_date ?? '—'} · {student.gender ?? '—'}</p><StatusCapsule status={student.status} /></section><section className="tile"><h2 className="text-xl font-semibold mb-4">Orang tua</h2>{student.guardians.map((guardian) => <p key={`${guardian.name}-${guardian.email}`} className="py-2 border-b border-stone-100">{guardian.name} · {guardian.phone ?? '—'} · {guardian.email ?? '—'}</p>)}</section><section className="tile"><h2 className="text-xl font-semibold mb-4">Kelas dan riwayat</h2>{student.enrollments.map((enrollment) => <p key={enrollment.id} className="py-2 border-b border-stone-100">{enrollment.classroom ?? 'Belum ada kelas'} · {enrollment.academic_year ?? '—'} · {enrollment.status}</p>)}</section><section className="tile"><h2 className="text-xl font-semibold mb-4">Ringkasan tagihan</h2>{student.invoices.map((invoice) => <p key={invoice.id} className="flex justify-between py-2 border-b border-stone-100"><span>{invoice.invoice_number}</span><span>{rupiah(invoice.amount)} · {invoice.status}</span></p>)}</section></div><Link href="/kepsek/laporan-evaluasi" className="inline-flex mt-6 text-[var(--primary)] font-semibold">Buka laporan evaluasi</Link></>;
}

StudentShow.layout = getPrincipalLayout;
