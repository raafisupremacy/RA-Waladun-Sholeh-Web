import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import ParentLayout from '@/Layouts/ParentLayout';
import BottomSheet from '@/Components/BottomSheet';
import EmptyState from '@/Components/EmptyState';
import Pagination, { PageData } from '@/Components/Pagination';
import SegmentedControl from '@/Components/SegmentedControl';
import StatusCapsule from '@/Components/StatusCapsule';

type Student = { id: number; name: string; nis: string; classroom?: string | null };
type Year = { id: number; name: string; is_active: boolean };
type Invoice = { id: number; invoice_number: string; status: string; amount: number; discount_amount: number; net_amount: number; due_date: string; paid_at?: string | null; period_month: number; period_year: number; student?: Student | null; rejection_reason?: string | null };
type Props = { invoices: PageData<Invoice>; students: Student[]; activeStudentId?: number | null; academicYears: Year[]; selectedAcademicYearId?: number | null; unpaidCount: number };
const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const money = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;
const date = (value: string) => new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Invoices({ invoices, students, activeStudentId, academicYears, selectedAcademicYearId, unpaidCount }: Props) {
    const p = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };
    const [switching, setSwitching] = useState(false);
    const student = students.find(item => item.id === activeStudentId);
    const selectYear = (id: number) => router.get('/ortu/tagihan', { student_id: activeStudentId, academic_year_id: id }, { preserveState: true, replace: true });
    const statusNote = (invoice: Invoice) => {
        if (invoice.status === 'lunas' && invoice.paid_at) return `Dibayar ${date(invoice.paid_at)}`;
        if (invoice.status === 'menunggu_verifikasi') return 'Menunggu pengecekan bukti transfer';
        if (invoice.status === 'ditolak') return invoice.rejection_reason ?? 'Bukti pembayaran ditolak';
        return `Jatuh tempo ${date(invoice.due_date)}`;
    };
    return <ParentLayout appName={p.appName} schoolName={p.schoolSettings?.school_name}>
        <Head title="Tagihan" />
        <section className="parent-invoices-hero">
            <p className="eyebrow">Keuangan keluarga</p>
            <h1>Tagihan</h1>
            <div className="parent-active-child">{student?.name ?? 'Belum ada anak aktif'}{student?.classroom ? ` · ${student.classroom}` : ''}{students.length > 1 && <button type="button" onClick={() => setSwitching(true)}>Ganti anak&nbsp;›</button>}</div>
            <div className="parent-unpaid-count"><strong>{unpaidCount}</strong><span>tagihan belum dibayar</span></div>
            <SegmentedControl options={academicYears.map(year => year.name)} value={academicYears.find(year => year.id === selectedAcademicYearId)?.name ?? ''} onChange={name => { const year = academicYears.find(item => item.name === name); if (year) selectYear(year.id); }} />
        </section>
        <BottomSheet open={switching} title="Ganti anak" onClose={() => setSwitching(false)}><div className="child-options">{students.map(child => <Link key={child.id} href={`/ortu/tagihan?student_id=${child.id}&academic_year_id=${selectedAcademicYearId ?? ''}`} aria-current={child.id === activeStudentId ? 'true' : undefined} onClick={() => setSwitching(false)}>{child.name}<span>{child.classroom ?? 'Belum ada kelompok'}</span></Link>)}</div></BottomSheet>
        <section className="parent-invoice-list">
            {invoices.data.length === 0 ? <EmptyState>Belum ada tagihan untuk tahun ajaran ini.</EmptyState> : <div className="parent-invoice-rows">{invoices.data.map(invoice => <Link className="parent-invoice-row" key={invoice.id} href={`/ortu/tagihan/${invoice.id}`}><div><h2>{months[invoice.period_month - 1]} {invoice.period_year}</h2><p>{money(invoice.net_amount)} <span>·</span> <span className={invoice.status === 'ditolak' ? 'invoice-rejection' : ''}>{statusNote(invoice)}</span></p></div><StatusCapsule status={invoice.status} /><span className="invoice-row-arrow" aria-hidden="true">›</span></Link>)}</div>}
            {invoices.data.length > 0 && <p className="parent-invoice-hint">Ketuk baris tagihan untuk melihat rincian pembayaran atau mengunggah ulang bukti.</p>}
            <Pagination page={invoices} />
        </section>
    </ParentLayout>;
}
