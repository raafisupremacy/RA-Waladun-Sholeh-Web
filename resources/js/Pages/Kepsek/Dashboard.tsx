import { Head, router, usePage } from '@inertiajs/react';
import PrincipalLayout from '@/Layouts/PrincipalLayout';
import BigNumber from '@/Components/BigNumber';
import ResponsiveTable from '@/Components/ResponsiveTable';
import CustomSelect from '@/Components/CustomSelect';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    LabelList,
} from 'recharts';

type Point = { label: string; period: string; total: number };

type SummaryComposition = {
    count: number;
    amount: number;
};

type Summary = {
    month: number;
    year: number;
    total_invoices: number;
    paid_percentage: number;
    target_amount: number;
    composition: {
        lunas: SummaryComposition;
        menunggu_verifikasi: SummaryComposition;
        belum_bayar: SummaryComposition;
    };
};

type TeacherCompletion = {
    teacher_id: number;
    teacher_name: string;
    classroom_name: string;
    filled: number;
    possible: number;
    percentage: number;
};

type OverdueStudent = {
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

type AcademicYearOption = {
    id: number;
    name: string;
};

type Props = {
    month: number;
    year: number;
    startYear?: number;
    endYear?: number;
    academicYearId?: number;
    academicYears: AcademicYearOption[];
    summary: Summary;
    trend: Point[];
    activeStudentsCount: number;
    journalCompletion: TeacherCompletion[];
    overdue: OverdueStudent[];
};

const MONTH_NAMES = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];

export default function Dashboard({
    month,
    year,
    startYear,
    endYear,
    academicYearId,
    academicYears,
    summary,
    trend,
    activeStudentsCount,
    journalCompletion,
    overdue,
}: Props) {
    const p = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    const effectiveStartYear = startYear ?? (month >= 7 ? year : year - 1);
    const effectiveEndYear = endYear ?? (month >= 7 ? year + 1 : year);

    const monthOptions = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map((m) => {
        const y = m >= 7 ? effectiveStartYear : effectiveEndYear;
        return {
            value: m,
            label: `${MONTH_NAMES[m - 1]} ${y}`,
        };
    });

    const academicYearOptions = academicYears.map((ay) => ({
        value: ay.id,
        label: ay.name,
    }));

    const handleFilterChange = (newMonth: number, newYearId?: number) => {
        router.get(
            '/kepsek',
            {
                month: newMonth,
                academic_year_id: newYearId ?? academicYearId,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const lunasCount = summary.composition.lunas?.count ?? 0;
    const lunasAmount = summary.composition.lunas?.amount ?? 0;
    const pendingCount = summary.composition.menunggu_verifikasi?.count ?? 0;
    const pendingAmount = summary.composition.menunggu_verifikasi?.amount ?? 0;
    const unpaidCount = summary.composition.belum_bayar?.count ?? 0;
    const unpaidAmount = summary.composition.belum_bayar?.amount ?? 0;

    const totalCount = summary.total_invoices || (lunasCount + pendingCount + unpaidCount) || 1;
    const lunasPct = (lunasCount / totalCount) * 100;
    const pendingPct = (pendingCount / totalCount) * 100;
    const unpaidPct = (unpaidCount / totalCount) * 100;

    const averageCompletion =
        journalCompletion.length > 0
            ? Math.round(
                  journalCompletion.reduce((acc, curr) => acc + curr.percentage, 0) /
                      journalCompletion.length
              )
            : 0;

    const totalOverdueAmount = overdue.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <PrincipalLayout appName={p.appName} schoolName={p.schoolSettings?.school_name}>
            <Head title="Dashboard kepala sekolah" />

            {/* Top Bar with Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-1)]">
                        SPP bulan ini
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <CustomSelect
                        value={month}
                        onChange={(val) => handleFilterChange(Number(val), academicYearId)}
                        options={monthOptions}
                        placeholder="Pilih bulan"
                    />

                    <CustomSelect
                        value={academicYearId || ''}
                        onChange={(val) => handleFilterChange(month, Number(val))}
                        options={academicYearOptions}
                        placeholder="Tahun ajaran"
                    />
                </div>
            </div>

            {/* Hero Card: Tuition percentage & stacked bar */}
            <section className="tile p-6 sm:p-8 mb-6 bg-[var(--surface)] rounded-[22px] shadow-sm">
                <div className="flex items-baseline gap-3 mb-5">
                    <span className="text-[42px] sm:text-[54px] font-bold tracking-tight text-[var(--text-1)] leading-none">
                        {summary.paid_percentage}%
                    </span>
                    <span className="text-lg sm:text-xl font-medium text-[var(--text-2)]">
                        sudah lunas
                    </span>
                </div>

                {/* Stacked Progress Bar */}
                <div className="w-full h-4 sm:h-5 rounded-full overflow-hidden flex bg-[#EEEEF1] mb-5">
                    <div
                        style={{ width: `${lunasPct}%` }}
                        className="bg-[#0071E3] transition-all duration-500"
                        title={`Lunas: ${lunasPct.toFixed(1)}%`}
                    />
                    <div
                        style={{ width: `${pendingPct}%` }}
                        className="bg-[#F59E0B] transition-all duration-500"
                        title={`Menunggu: ${pendingPct.toFixed(1)}%`}
                    />
                    <div
                        style={{ width: `${unpaidPct}%` }}
                        className="bg-[#D1D1D6] transition-all duration-500"
                        title={`Belum bayar: ${unpaidPct.toFixed(1)}%`}
                    />
                </div>

                {/* Legend Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-[var(--text-2)]">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#0071E3] inline-block" />
                            <span>
                                {lunasCount} Lunas · Rp {lunasAmount.toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block" />
                            <span>
                                {pendingCount} Menunggu verifikasi · Rp {pendingAmount.toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#D1D1D6] inline-block" />
                            <span>
                                {unpaidCount} Belum bayar · Rp {unpaidAmount.toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    <div className="font-semibold text-[var(--text-1)]">
                        Target Rp {summary.target_amount.toLocaleString('id-ID')} · {summary.total_invoices} siswa
                    </div>
                </div>
            </section>

            {/* Bento Grid (2 Columns): Active Student Trend + Journal Completion */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Tile 1: Trend Line Chart */}
                <article className="tile p-6 sm:p-8 bg-[var(--surface)] rounded-[24px] shadow-sm flex flex-col justify-between">
                    <div>
                        <h2 className="text-base sm:text-lg font-semibold text-[var(--text-1)] mb-4">
                            Bagaimana jumlah siswa aktif berubah?
                        </h2>
                        <div className="flex items-baseline gap-2 mb-6">
                            <BigNumber>{activeStudentsCount}</BigNumber>
                            <span className="text-sm sm:text-base font-medium text-[var(--text-2)]">
                                siswa aktif
                            </span>
                        </div>
                    </div>

                    <div className="w-full h-[200px] sm:h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trend} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid stroke="#E5E5EA" strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6E6E73', fontSize: 13 }}
                                />
                                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#0071E3"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#FFFFFF', stroke: '#0071E3', strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                >
                                    <LabelList
                                        dataKey="total"
                                        position="top"
                                        offset={10}
                                        style={{ fontSize: '13px', fontWeight: 600, fill: '#1D1D1F' }}
                                    />
                                </Line>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                {/* Tile 2: Journal Completion Progress Bars */}
                <article className="tile p-6 sm:p-8 bg-[var(--surface)] rounded-[24px] shadow-sm flex flex-col justify-between">
                    <div>
                        <h2 className="text-base sm:text-lg font-semibold text-[var(--text-1)] mb-4">
                            Seberapa lengkap jurnal harian tiap guru?
                        </h2>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-[44px] sm:text-[56px] font-bold tracking-tight text-[var(--text-1)] leading-none">
                                {averageCompletion}%
                            </span>
                            <span className="text-sm sm:text-base font-medium text-[var(--text-2)]">
                                rata-rata keterisian
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        {journalCompletion.map((row) => (
                            <div key={row.teacher_id} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-[var(--text-1)]">
                                        {row.teacher_name} {row.classroom_name ? `· ${row.classroom_name}` : ''}
                                    </span>
                                    <span className="font-semibold text-[var(--text-1)]">
                                        {row.percentage}% · {row.filled} dari {row.possible}
                                    </span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-[#EEEEF1] overflow-hidden">
                                    <div
                                        style={{ width: `${Math.min(100, row.percentage)}%` }}
                                        className="h-full bg-[#0071E3] rounded-full transition-all duration-500"
                                    />
                                </div>
                            </div>
                        ))}

                        {journalCompletion.length === 0 && (
                            <p className="text-sm text-[var(--text-2)]">
                                Belum ada data keterisian jurnal untuk periode ini.
                            </p>
                        )}
                    </div>
                </article>
            </div>

            {/* Bottom Wide Tile: Overdue >30 days table */}
            <section className="tile p-6 sm:p-8 bg-[var(--surface)] rounded-[24px] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)]">
                        Siapa yang menunggak lebih dari 30 hari?
                    </h2>
                    <span className="text-xs sm:text-sm text-[var(--text-2)]">
                        {overdue.length} siswa perlu tindak lanjut
                    </span>
                </div>

                <ResponsiveTable
                    rows={overdue.map((r) => ({ ...r, id: r.student_id }))}
                    columns={[
                        {
                            key: 'student_name',
                            label: 'Nama siswa',
                            render: (_, row) => (
                                <span className="font-semibold text-[var(--text-1)]">
                                    {row.student_name}
                                </span>
                            ),
                        },
                        {
                            key: 'classroom',
                            label: 'Kelas',
                            render: (_, row) => (
                                <span className="text-[var(--text-2)]">{row.classroom}</span>
                            ),
                        },
                        {
                            key: 'months',
                            label: 'Bulan menunggak',
                            render: (_, row) => (
                                <span className="text-[var(--text-2)] text-xs sm:text-sm">
                                    {row.months}
                                </span>
                            ),
                        },
                        {
                            key: 'amount',
                            label: 'Nominal tagihan',
                            render: (_, row) => (
                                <span className="font-semibold text-[var(--text-1)]">
                                    Rp {row.amount.toLocaleString('id-ID')}
                                </span>
                            ),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: () => (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FDE7E5] text-[#C4271B]">
                                    Menunggak &gt;30 hari
                                </span>
                            ),
                        },
                    ]}
                />

                {overdue.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-[var(--separator)] flex justify-end">
                        <span className="text-base sm:text-lg font-bold text-[var(--text-1)]">
                            Total tunggakan: Rp {totalOverdueAmount.toLocaleString('id-ID')}
                        </span>
                    </div>
                )}
            </section>
        </PrincipalLayout>
    );
}


