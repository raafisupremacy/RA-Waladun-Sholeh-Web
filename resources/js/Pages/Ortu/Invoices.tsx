import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { getParentLayout } from '@/Layouts/ParentLayout';
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
    return (
        <div className="parent-invoices-wrapper">
            <Head title="Tagihan" />
            <BottomSheet open={switching} title="Ganti anak" onClose={() => setSwitching(false)}>
                <div className="child-options">
                    {students.map(child => (
                        <Link
                            key={child.id}
                            href={`/ortu/tagihan?student_id=${child.id}&academic_year_id=${selectedAcademicYearId ?? ''}`}
                            aria-current={child.id === activeStudentId ? 'true' : undefined}
                            onClick={() => setSwitching(false)}
                        >
                            {child.name}<span>{child.classroom ?? 'Belum ada kelompok'}</span>
                        </Link>
                    ))}
                </div>
            </BottomSheet>

            {/* Top Segment / Hero Container (White Surface) */}
            <section className="w-full bg-[var(--surface)] pt-10 pb-12 md:pt-14 md:pb-16 border-b border-[var(--separator)]">
                <div className="max-w-[760px] mx-auto px-4 md:px-0 flex flex-col items-start">
                    <h1 className="text-4xl md:text-[56px] font-semibold text-[var(--text)] tracking-tight leading-none m-0">
                        Tagihan
                    </h1>

                    <div className="mt-2.5 flex flex-wrap items-center text-[var(--text-2)] text-base md:text-lg">
                        <span>
                            {student?.name ?? 'Belum ada anak aktif'} · {student?.classroom ?? 'Belum ada kelompok'}
                        </span>
                        {student && students.length > 1 && (
                            <button
                                type="button"
                                onClick={() => setSwitching(true)}
                                className="ml-3 text-[var(--accent)] font-semibold hover:underline cursor-pointer"
                            >
                                Ganti anak &gt;
                            </button>
                        )}
                    </div>

                    <div className="mt-8 flex items-baseline gap-3.5">
                        <span className="text-5xl md:text-[72px] font-semibold text-[var(--text)] tabular-nums tracking-tight leading-none">
                            {unpaidCount}
                        </span>
                        <span className="text-base md:text-xl text-[var(--text-2)] font-normal leading-none">
                            tagihan belum dibayar
                        </span>
                    </div>

                    <div className="mt-7 w-full max-w-[280px]">
                        <SegmentedControl
                            options={academicYears.map(year => year.name)}
                            value={academicYears.find(year => year.id === selectedAcademicYearId)?.name ?? ''}
                            onChange={name => {
                                const year = academicYears.find(item => item.name === name);
                                if (year) selectYear(year.id);
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* List Section (Canvas Gray Surface) */}
            <section className="w-full bg-[var(--bg)] py-10 md:py-14 min-h-[420px]">
                <div className="max-w-[760px] mx-auto px-4 md:px-0 flex flex-col">
                    {invoices.data.length === 0 ? (
                        <div className="p-12 bg-white rounded-[24px] border border-[var(--separator)] text-center text-[var(--text-2)] shadow-2xs">
                            <EmptyState>Belum ada tagihan untuk tahun ajaran ini.</EmptyState>
                        </div>
                    ) : (
                        <div className="w-full bg-white rounded-[24px] border border-[var(--separator)] overflow-hidden flex flex-col divide-y divide-[var(--separator)] shadow-2xs">
                            {invoices.data.map(invoice => (
                                <Link
                                    key={invoice.id}
                                    href={`/ortu/tagihan/${invoice.id}`}
                                    className="min-h-[88px] px-6 py-4 flex items-center justify-between hover:bg-[#FAFAFC] transition-colors group"
                                >
                                    <div className="flex flex-col justify-center gap-1 min-w-0 pr-4">
                                        <span className="text-lg md:text-[19px] font-semibold text-[var(--text)] leading-tight truncate">
                                            {months[invoice.period_month - 1]} {invoice.period_year}
                                        </span>
                                        <div className="flex items-center gap-2 flex-wrap text-sm leading-snug">
                                            <span className="font-medium text-[var(--text)]">
                                                {money(invoice.net_amount)}
                                            </span>
                                            <span className="text-[var(--separator)] select-none">·</span>
                                            <span className={invoice.status === 'ditolak' ? 'text-[#C4271B] font-medium' : 'text-[var(--text-2)]'}>
                                                {statusNote(invoice)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3.5 shrink-0">
                                        <StatusCapsule status={invoice.status} />
                                        <ChevronRight size={18} className="text-[var(--text-3)] group-hover:text-[var(--text)] transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {invoices.data.length > 0 && (
                        <p className="text-center text-xs md:text-sm text-[var(--text-2)] mt-6">
                            Ketuk baris tagihan untuk melihat rincian pembayaran atau mengunggah ulang bukti.
                        </p>
                    )}

                    <div className="mt-6 flex justify-center">
                        <Pagination page={invoices} />
                    </div>
                </div>
            </section>
        </div>
    );
}

Invoices.layout = getParentLayout;

