import { Head, router, usePage } from '@inertiajs/react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import ResponsiveTable from '@/Components/ResponsiveTable';
import SegmentedControl from '@/Components/SegmentedControl';
import Pagination, { PageData } from '@/Components/Pagination';
import StatusCapsule from '@/Components/StatusCapsule';
import CustomSelect from '@/Components/CustomSelect';

type InvoiceItem = {
    id: number;
    invoice_number: string;
    student?: { id: number; name: string; nis: string } | null;
    classroom?: string;
    status: string;
    due_date?: string;
    due_date_formatted?: string;
    amount: number;
    discount_amount: number;
    net_amount: number;
    description?: string;
};

type OverdueItem = {
    id?: number;
    student_id: number;
    student_name: string;
    classroom: string;
    months: string;
    amount: number;
    invoice_count: number;
    oldest_due_date?: string;
    status: string;
};

type ClassSummaryRow = {
    id: number;
    name: string;
    teacher_name: string;
    student_count: number;
    paid_count: number;
    unpaid_count: number;
    received_amount: number;
    outstanding_amount: number;
    achievement_percentage: number;
};

type ClassSummary = {
    classes: ClassSummaryRow[];
    totals: {
        student_count: number;
        paid_count: number;
        unpaid_count: number;
        received_amount: number;
        outstanding_amount: number;
        achievement_percentage: number;
    };
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
    tab: 'rekap' | 'tunggakan' | 'ringkasan_kelas';
    filters: {
        tab?: string;
        start_date?: string;
        end_date?: string;
        academic_year_id?: string | number;
        classroom_id?: string | number;
        status?: string;
    };
    totals?: {
        received: number;
        unreceived: number;
        invoice_count: number;
    };
    invoices?: PageData<InvoiceItem>;
    overdueList?: OverdueItem[];
    totalOverdue?: number;
    classSummary?: ClassSummary;
    classrooms?: ClassroomOption[];
    academicYears?: AcademicYearOption[];
};

export default function Reports({
    tab = 'rekap',
    filters,
    totals,
    invoices,
    overdueList = [],
    totalOverdue = 0,
    classSummary,
    classrooms = [],
    academicYears = [],
}: Props) {
    const p = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    const handleTabChange = (newTab: string) => {
        router.get(
            '/admin/laporan',
            { ...filters, tab: newTab, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const updateFilters = (newFilters: Partial<typeof filters>) => {
        router.get(
            '/admin/laporan',
            { ...filters, ...newFilters, tab, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const queryString = new URLSearchParams(
        Object.entries({ ...filters, tab }).filter(
            ([, v]) => v !== undefined && v !== '' && v !== null
        ) as [string, string][]
    ).toString();

    const pdfUrl = `/admin/laporan/pdf?${queryString}`;
    const excelUrl = `/admin/laporan/excel?${queryString}`;

    const previewRowCount =
        tab === 'rekap'
            ? invoices?.total ?? 0
            : tab === 'tunggakan'
            ? overdueList.length
            : classSummary?.classes.length ?? 0;

    const previewTotalAmount =
        tab === 'rekap'
            ? totals?.received ?? 0
            : tab === 'tunggakan'
            ? totalOverdue
            : classSummary?.totals.received_amount ?? 0;

    return (
        <>
            <Head title="Laporan admin" />

            {/* Segmented Control Tabs */}
            <div className="mb-6 pt-4">
                <SegmentedControl
                    options={[
                        { key: 'rekap', label: 'Rekap penerimaan SPP' },
                        { key: 'tunggakan', label: 'Tunggakan' },
                        { key: 'ringkasan_kelas', label: 'Ringkasan per kelas' },
                    ]}
                    value={tab}
                    onChange={handleTabChange}
                />
            </div>

            {/* Toolbar Filters & Action Buttons */}
            <div className="bg-[var(--surface)] p-4 sm:p-5 rounded-[20px] shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    {tab === 'rekap' && (
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
                    )}

                    {classrooms.length > 0 && tab !== 'ringkasan_kelas' && (
                        <CustomSelect
                            value={filters.classroom_id || ''}
                            onChange={(val) => updateFilters({ classroom_id: val ? String(val) : undefined })}
                            options={[
                                { value: '', label: 'Semua Kelas' },
                                ...classrooms.map((c) => ({ value: String(c.id), label: c.name })),
                            ]}
                        />
                    )}

                    {academicYears.length > 0 && tab === 'ringkasan_kelas' && (
                        <CustomSelect
                            value={filters.academic_year_id || ''}
                            onChange={(val) => updateFilters({ academic_year_id: val ? String(val) : undefined })}
                            options={[
                                { value: '', label: 'Tahun Ajaran Aktif' },
                                ...academicYears.map((ay) => ({ value: String(ay.id), label: ay.name })),
                            ]}
                        />
                    )}

                    {tab === 'rekap' && (
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
                    )}
                </div>

                <div className="flex items-center gap-3 ml-auto">
                    <a
                        href={excelUrl}
                        className="button-secondary inline-flex items-center gap-1.5 text-xs sm:text-sm"
                        download
                    >
                        Ekspor XLS
                    </a>
                    <a
                        href={pdfUrl}
                        className="button-primary inline-flex items-center gap-1.5 text-xs sm:text-sm"
                        download
                    >
                        Cetak PDF
                    </a>
                </div>
            </div>

            {/* Subtitle / Pratinjau Summary Row */}
            <div className="flex items-center justify-between text-xs sm:text-sm text-[var(--text-2)] mb-4 px-1">
                <span>Pratinjau {previewRowCount} baris</span>
                <span className="font-semibold text-[var(--text-1)]">
                    Total sementara: Rp {previewTotalAmount.toLocaleString('id-ID')}
                </span>
            </div>

            {/* Main Content Area based on Active Tab */}
            <div className="tile p-4 sm:p-6 bg-[var(--surface)] rounded-[24px] shadow-sm mb-8">
                {/* TAB 1: Rekap Penerimaan SPP */}
                {tab === 'rekap' && (
                    <>
                        <ResponsiveTable
                            rows={invoices?.data ?? []}
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
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#E8F1FD] text-[#0071E3] font-semibold text-xs flex items-center justify-center flex-shrink-0">
                                                {row.student?.name ? row.student.name.substring(0, 2).toUpperCase() : '??'}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-[var(--text-1)] text-sm">
                                                    {row.student?.name ?? '—'}
                                                </div>
                                                <div className="text-xs text-[var(--text-2)]">
                                                    NIS {row.student?.nis ?? '—'}
                                                </div>
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'classroom',
                                    label: 'Kelas',
                                    render: (_, row) => (
                                        <span className="text-sm text-[var(--text-2)]">
                                            {row.classroom ?? '—'}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'description',
                                    label: 'Keterangan',
                                    render: (_, row) => (
                                        <span className="text-sm text-[var(--text-2)]">
                                            {row.description ?? `SPP ${row.invoice_number}`}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'amount',
                                    label: 'Nominal',
                                    render: (_, row) => (
                                        <span className="font-semibold text-[var(--text-1)] text-sm">
                                            Rp {row.net_amount.toLocaleString('id-ID')}
                                        </span>
                                    ),
                                },
                            ]}
                        />

                        {/* Summary Footer */}
                        {totals && totals.invoice_count > 0 && (
                            <div className="mt-6 pt-4 border-t border-[var(--separator)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="font-semibold text-sm sm:text-base text-[var(--text-1)]">
                                    Total Penerimaan Kas ({totals.invoice_count} transaksi)
                                </span>
                                <span className="font-bold text-base sm:text-lg text-[var(--text-1)]">
                                    Rp {totals.received.toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}

                        {/* Pagination */}
                        {invoices && invoices.total > 0 && (
                            <div className="mt-6 pt-4 border-t border-[var(--separator)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <span className="text-xs sm:text-sm text-[var(--text-2)]">
                                    Menampilkan {invoices.from}–{invoices.to} dari {invoices.total} baris data laporan
                                </span>
                                <Pagination page={invoices} />
                            </div>
                        )}
                    </>
                )}

                {/* TAB 2: Tunggakan */}
                {tab === 'tunggakan' && (
                    <>
                        <ResponsiveTable
                            rows={overdueList.map((item) => ({ ...item, id: item.student_id }))}
                            columns={[
                                {
                                    key: 'student_name',
                                    label: 'Nama Siswa',
                                    render: (_, row) => (
                                        <div className="font-semibold text-[var(--text-1)] text-sm">
                                            {row.student_name}
                                        </div>
                                    ),
                                },
                                {
                                    key: 'classroom',
                                    label: 'Kelas',
                                    render: (_, row) => (
                                        <span className="text-sm text-[var(--text-2)]">
                                            {row.classroom}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'months',
                                    label: 'Bulan Menunggak',
                                    render: (_, row) => (
                                        <span className="text-xs sm:text-sm text-[var(--text-2)]">
                                            {row.months}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'amount',
                                    label: 'Nominal',
                                    render: (_, row) => (
                                        <span className="font-semibold text-[var(--text-1)] text-sm">
                                            Rp {row.amount.toLocaleString('id-ID')}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'status',
                                    label: 'Status',
                                    render: () => (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDE7E5] text-[#C4271B]">
                                            Menunggak &gt;30 hari
                                        </span>
                                    ),
                                },
                            ]}
                        />

                        {overdueList.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-[var(--separator)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="font-semibold text-sm sm:text-base text-[var(--text-1)]">
                                    Total Tunggakan ({overdueList.length} tagihan)
                                </span>
                                <span className="font-bold text-base sm:text-lg text-[var(--text-1)]">
                                    Rp {totalOverdue.toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}
                    </>
                )}

                {/* TAB 3: Ringkasan per Kelas */}
                {tab === 'ringkasan_kelas' && (
                    <>
                        <ResponsiveTable
                            rows={classSummary?.classes ?? []}
                            columns={[
                                {
                                    key: 'name',
                                    label: 'Kelas',
                                    render: (_, row) => (
                                        <span className="font-semibold text-[var(--text-1)] text-sm">
                                            {row.name}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'teacher_name',
                                    label: 'Wali Kelas',
                                    render: (_, row) => (
                                        <span className="text-sm text-[var(--text-2)]">
                                            {row.teacher_name}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'student_count',
                                    label: 'Jumlah Siswa',
                                    render: (_, row) => (
                                        <span className="text-sm text-[var(--text-1)]">
                                            {row.student_count} anak
                                        </span>
                                    ),
                                },
                                {
                                    key: 'paid_count',
                                    label: 'Lunas',
                                    render: (_, row) => (
                                        <span className="text-sm text-[#1D7A3C] font-medium">
                                            {row.paid_count}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'unpaid_count',
                                    label: 'Belum Lunas',
                                    render: (_, row) => (
                                        <span className="text-sm text-[#C4271B] font-medium">
                                            {row.unpaid_count}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'received_amount',
                                    label: 'Total Diterima',
                                    render: (_, row) => (
                                        <span className="font-semibold text-[var(--text-1)] text-sm">
                                            Rp {row.received_amount.toLocaleString('id-ID')}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'outstanding_amount',
                                    label: 'Total Tunggakan',
                                    render: (_, row) => (
                                        <span className="text-sm text-[var(--text-2)]">
                                            Rp {row.outstanding_amount.toLocaleString('id-ID')}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'achievement_percentage',
                                    label: '% Capaian',
                                    render: (_, row) => (
                                        <span className="font-semibold text-[var(--accent)] text-sm">
                                            {row.achievement_percentage}%
                                        </span>
                                    ),
                                },
                            ]}
                        />

                        {classSummary && (
                            <div className="mt-6 pt-4 border-t border-[var(--separator)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="font-semibold text-sm sm:text-base text-[var(--text-1)]">
                                    Total Keseluruhan ({classSummary.totals.student_count} siswa)
                                </span>
                                <div className="text-right">
                                    <span className="font-bold text-base sm:text-lg text-[var(--text-1)]">
                                        Rp {classSummary.totals.received_amount.toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-xs text-[var(--text-2)] block">
                                        Capaian: {classSummary.totals.achievement_percentage}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

Reports.layout = getAdminLayout;



