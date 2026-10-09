import { Head, router, usePage } from '@inertiajs/react';
import PrincipalLayout from '@/Layouts/PrincipalLayout';
import ResponsiveTable from '@/Components/ResponsiveTable';
import Pagination, { PageData } from '@/Components/Pagination';
import CustomSelect from '@/Components/CustomSelect';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    LabelList,
} from 'recharts';

type InvoiceItem = {
    id: number;
    invoice_number: string;
    student?: { id: number; name: string } | null;
    classroom?: string;
    status: string;
    due_date?: string;
    due_date_formatted?: string;
    amount: number;
    discount_amount: number;
    net_amount: number;
    description?: string;
};

type MonthlyBar = {
    label: string;
    period: string;
    total: number;
};

type ClassroomOption = {
    id: number;
    name: string;
    academic_year_id: number;
};

type AcademicYearOption = {
    id: number;
    name: string;
};

type Props = {
    invoices: PageData<InvoiceItem>;
    totals: {
        received: number;
        unreceived: number;
        invoice_count: number;
    };
    monthlyReceived?: MonthlyBar[];
    filters: {
        start_date?: string;
        end_date?: string;
        academic_year_id?: string | number;
        classroom_id?: string | number;
        status?: string;
    };
    classrooms?: ClassroomOption[];
    academicYears?: AcademicYearOption[];
};

export default function FinanceReport({
    invoices,
    totals,
    monthlyReceived = [],
    filters,
    classrooms = [],
    academicYears = [],
}: Props) {
    const p = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    const updateFilters = (newFilters: Partial<typeof filters>) => {
        router.get(
            '/kepsek/laporan-keuangan',
            { ...filters, ...newFilters, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const queryString = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== null) as [string, string][]
    ).toString();

    const pdfUrl = `/kepsek/laporan-keuangan/pdf${queryString ? `?${queryString}` : ''}`;
    const excelUrl = `/kepsek/laporan-keuangan/excel${queryString ? `?${queryString}` : ''}`;

    return (
        <PrincipalLayout appName={p.appName} schoolName={p.schoolSettings?.school_name}>
            <Head title="Laporan keuangan" />

            {/* Header & Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pt-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-1)]">
                        Laporan Keuangan
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <a
                        href={excelUrl}
                        className="button-secondary inline-flex items-center gap-1.5 text-sm"
                        download
                    >
                        Export Excel
                    </a>
                    <a
                        href={pdfUrl}
                        className="button-primary inline-flex items-center gap-1.5 text-sm"
                        download
                    >
                        Export PDF
                    </a>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-[var(--surface)] p-4 sm:p-5 rounded-[20px] shadow-sm mb-8 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={filters.start_date || ''}
                        onChange={(e) => updateFilters({ start_date: e.target.value })}
                        className="h-10 px-3 rounded-full border border-[var(--separator)] text-xs sm:text-sm text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        placeholder="Dari tanggal"
                    />
                    <span className="text-[var(--text-2)] text-xs sm:text-sm">–</span>
                    <input
                        type="date"
                        value={filters.end_date || ''}
                        onChange={(e) => updateFilters({ end_date: e.target.value })}
                        className="h-10 px-3 rounded-full border border-[var(--separator)] text-xs sm:text-sm text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        placeholder="Sampai tanggal"
                    />
                </div>

                {classrooms.length > 0 && (
                    <CustomSelect
                        value={filters.classroom_id || ''}
                        onChange={(val) => updateFilters({ classroom_id: val ? String(val) : undefined })}
                        options={[
                            { value: '', label: 'Semua Kelas' },
                            ...classrooms.map((c) => ({ value: String(c.id), label: c.name })),
                        ]}
                    />
                )}

                <CustomSelect
                    value={filters.status || ''}
                    onChange={(val) => updateFilters({ status: val ? String(val) : undefined })}
                    options={[
                        { value: '', label: 'Semua Status' },
                        { value: 'lunas', label: 'Lunas' },
                        { value: 'menunggu_verifikasi', label: 'Menunggu Verifikasi' },
                        { value: 'belum_bayar', label: 'Belum Bayar' },
                        { value: 'ditolak', label: 'Ditolak' },
                    ]}
                />

                {(filters.start_date || filters.end_date || filters.classroom_id || filters.status) && (
                    <button
                        type="button"
                        onClick={() => router.get('/kepsek/laporan-keuangan')}
                        className="text-xs font-semibold text-[var(--accent)] hover:underline ml-auto"
                    >
                        Reset Filter
                    </button>
                )}
            </div>

            {/* Hero Received / Unreceived Stats */}
            <div className="flex flex-wrap items-baseline gap-6 sm:gap-12 mb-10">
                <div className="flex flex-col">
                    <span className="text-[38px] sm:text-[56px] font-bold tracking-tight text-[var(--text-1)] leading-none">
                        Rp {totals.received.toLocaleString('id-ID')}
                    </span>
                    <span className="text-base sm:text-lg font-medium text-[var(--text-2)] mt-2">
                        diterima
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-[38px] sm:text-[56px] font-bold tracking-tight text-[var(--text-2)] leading-none">
                        Rp {totals.unreceived.toLocaleString('id-ID')}
                    </span>
                    <span className="text-base sm:text-lg font-medium text-[var(--text-2)] mt-2">
                        belum diterima
                    </span>
                </div>
            </div>

            {/* Tile 1: Penerimaan per bulan (Monthly Bar Chart) */}
            {monthlyReceived.length > 0 && (
                <section className="tile p-6 sm:p-8 bg-[var(--surface)] rounded-[24px] shadow-sm mb-8">
                    <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)] mb-6">
                        Penerimaan per bulan
                    </h2>
                    <div className="w-full h-[220px] sm:h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyReceived} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid stroke="#E5E5EA" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6E6E73', fontSize: 13 }} />
                                <YAxis hide />
                                <Bar dataKey="total" fill="#0071E3" radius={[8, 8, 0, 0]} maxBarSize={48}>
                                    <LabelList
                                        dataKey="total"
                                        position="top"
                                        formatter={(val: unknown) => (typeof val === 'number' && val > 0 ? `Rp ${val.toLocaleString('id-ID')}` : '')}
                                        style={{ fontSize: '12px', fontWeight: 600, fill: '#1D1D1F' }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            )}

            {/* Tile 2: Rincian Transaksi */}
            <section className="tile p-6 sm:p-8 bg-[var(--surface)] rounded-[24px] shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)] mb-6">
                    Rincian Transaksi
                </h2>

                <ResponsiveTable
                    rows={invoices.data}
                    columns={[
                        {
                            key: 'due_date',
                            label: 'Tanggal',
                            render: (_, row) => (
                                <span className="text-sm text-[var(--text-2)]">
                                    {row.due_date_formatted || row.due_date || '—'}
                                </span>
                            ),
                        },
                        {
                            key: 'student',
                            label: 'Siswa',
                            render: (_, row) => (
                                <span className="font-semibold text-[var(--text-1)]">
                                    {row.student?.name ?? '—'}
                                </span>
                            ),
                        },
                        {
                            key: 'classroom',
                            label: 'Kelas',
                            render: (_, row) => (
                                <span className="text-sm text-[var(--text-2)]">{row.classroom ?? '—'}</span>
                            ),
                        },
                        {
                            key: 'description',
                            label: 'Keterangan',
                            render: (_, row) => (
                                <span className="text-sm text-[var(--text-2)]">
                                    {row.description ?? `Tagihan ${row.invoice_number}`}
                                </span>
                            ),
                        },
                        {
                            key: 'amount',
                            label: 'Nominal',
                            render: (_, row) => (
                                <span className="font-semibold text-[var(--text-1)]">
                                    Rp {row.net_amount.toLocaleString('id-ID')}
                                </span>
                            ),
                        },
                    ]}
                />

                {/* Pagination */}
                {invoices.total > 0 && (
                    <div className="mt-6 pt-4 border-t border-[var(--separator)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <span className="text-xs sm:text-sm text-[var(--text-2)]">
                            Menampilkan {invoices.from}–{invoices.to} dari {invoices.total} transaksi
                        </span>
                        <Pagination page={invoices} />
                    </div>
                )}
            </section>
        </PrincipalLayout>
    );
}


