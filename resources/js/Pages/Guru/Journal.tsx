import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, BookOpen, Calendar, CheckCircle2, RotateCcw, Search } from 'lucide-react';
import { getTeacherLayout } from '@/Layouts/TeacherLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import EmptyState from '@/Components/EmptyState';

type JournalItem = {
    id: number;
    student_id: number;
    student: {
        id: number;
        name: string;
        nis: string;
        initials: string;
    } | null;
    journal_date: string;
    journal_date_formatted: string;
    activity_summary: string;
    status: string;
    status_label: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    classroom: {
        id: number;
        name: string;
    } | null;
    today_stats: {
        date_formatted: string;
        filled: number;
        total: number;
        next_student_id: number | null;
    };
    filters: {
        date: string;
        q: string;
    };
    journals: {
        data: JournalItem[];
        links: PaginationLink[];
        total: number;
        from: number | null;
        to: number | null;
    };
};

export default function Journal({ classroom, today_stats, filters, journals }: Props) {
    const pageProps = usePage().props as {
        appName?: string;
        schoolSettings?: Record<string, string>;
    };

    const [searchQuery, setSearchQuery] = useState(filters.q || '');
    const [filterDate, setFilterDate] = useState(filters.date || '');

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/guru/jurnal',
            { q: searchQuery || undefined, date: filterDate || undefined },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearchQuery('');
        setFilterDate('');
        router.get('/guru/jurnal', {}, { preserveState: true, replace: true });
    };

    const hasActiveFilters = Boolean(filters.q || filters.date);

    return (
        <>
            <Head title="Manajemen & Riwayat Jurnal Harian" />

            <div className="space-y-6">
                {/* Hero Tile */}
                <section className="tile p-6 md:p-8 bg-white rounded-[24px] border border-[var(--border)] shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">
                                <BookOpen size={14} strokeWidth={2} />
                                <span>{classroom ? classroom.name : 'Jurnal Harian'}</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text)]">
                                Riwayat & Manajemen Jurnal Siswa
                            </h1>
                            <p className="text-[var(--text-2)] text-sm md:text-base mt-1.5 max-w-2xl">
                                Kelola, cari, dan tinjau seluruh catatan perkembangan harian siswa di kelas Anda.
                                Buka jurnal untuk melihat detail penilaian atau memperbarui observasi.
                            </p>
                        </div>

                        {/* Quick CTA Card */}
                        <div className="bg-[#F5F5F7] rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center justify-between gap-4 border border-[var(--separator)] shrink-0 min-w-[280px]">
                            <div>
                                <p className="text-xs text-[var(--text-2)] font-medium">
                                    Hari ini · {today_stats.date_formatted}
                                </p>
                                <p className="text-lg font-bold text-[var(--text)] flex items-center gap-1.5 mt-0.5">
                                    <CheckCircle2 size={18} className="text-[#1D7A3C]" />
                                    <span>{today_stats.filled} dari {today_stats.total} terisi</span>
                                </p>
                            </div>
                            <Link
                                href={today_stats.next_student_id ? `/guru/jurnal/${today_stats.next_student_id}` : '/guru'}
                                className="bg-[var(--accent,#0071E3)] text-white text-xs md:text-sm px-4 py-2 rounded-full font-semibold hover:bg-[#0077ED] transition-colors shadow-xs inline-flex items-center gap-1.5 shrink-0"
                            >
                                <span>{today_stats.next_student_id ? 'Isi Jurnal Hari Ini' : 'Buka Beranda'}</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Filter and Table Section */}
                <section className="tile p-6 md:p-8 bg-white rounded-[24px] border border-[var(--border)] shadow-xs">
                    {/* Filter Bar */}
                    <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-6 border-b border-[var(--separator)]">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                            {/* Search Name/NIS */}
                            <div className="relative flex-1 max-w-md">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-2)] pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari nama siswa atau NIS..."
                                    className="w-full pl-9 pr-4 py-2 text-sm rounded-full border border-[var(--border)] bg-[#F5F5F7] focus:bg-white focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                                />
                            </div>

                            {/* Date Picker */}
                            <div className="relative flex items-center bg-[#F5F5F7] border border-[var(--border)] rounded-full px-3 py-1.5 text-sm">
                                <Calendar size={15} className="text-[var(--text-2)] mr-2 shrink-0 pointer-events-none" />
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="border-0 p-0 text-sm bg-transparent focus:ring-0 text-[var(--text)] cursor-pointer"
                                />
                            </div>

                            <button
                                type="submit"
                                className="bg-[var(--text)] text-white text-xs md:text-sm px-4 py-2 rounded-full font-medium hover:bg-black transition-colors"
                            >
                                Filter
                            </button>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="text-xs text-[var(--text-2)] hover:text-[var(--text)] inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors"
                                >
                                    <RotateCcw size={13} />
                                    <span>Reset</span>
                                </button>
                            )}
                        </div>

                        <div className="text-xs text-[var(--text-2)] self-end sm:self-center">
                            Total: <span className="font-semibold text-[var(--text)]">{journals.total}</span> catatan
                        </div>
                    </form>

                    {/* Content List */}
                    {journals.data.length === 0 ? (
                        <div className="py-16">
                            <EmptyState>
                                {hasActiveFilters
                                    ? 'Tidak ada jurnal yang sesuai dengan pencarian atau filter tanggal yang dipilih.'
                                    : 'Belum ada catatan jurnal yang tersimpan untuk kelas Anda.'}
                            </EmptyState>
                        </div>
                    ) : (
                        <div className="pt-2 divide-y divide-[var(--separator)]">
                            {journals.data.map((item) => (
                                <div
                                    key={item.id}
                                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FBFBFD] -mx-4 px-4 rounded-xl transition-colors"
                                >
                                    {/* Student Info */}
                                    <div className="flex items-center gap-3.5 min-w-[240px]">
                                        <div className="w-10 h-10 rounded-full bg-[#EBF4FE] text-[var(--accent)] font-semibold text-sm flex items-center justify-center shrink-0">
                                            {item.student?.initials ?? '??'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm md:text-base text-[var(--text)] truncate">
                                                {item.student?.name ?? 'Siswa'}
                                            </p>
                                            <p className="text-xs text-[var(--text-2)] mt-0.5">
                                                NIS {item.student?.nis ?? '-'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Date & Activity Summary */}
                                    <div className="flex-1 min-w-0 md:px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-[var(--text)]">
                                                {item.journal_date_formatted}
                                            </span>
                                            <span className="text-[var(--separator)]">·</span>
                                            <span className="text-xs text-[var(--text-2)] truncate max-w-md">
                                                {item.activity_summary}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status & Action Button */}
                                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t border-[var(--separator)] md:border-t-0">
                                        <StatusCapsule
                                            status={item.status === 'final' ? 'sudah_diisi' : 'belum_diisi'}
                                            label={item.status_label}
                                        />

                                        <Link
                                            href={`/guru/jurnal/${item.student_id}?date=${item.journal_date}`}
                                            className="bg-white border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--accent-soft)] hover:border-[var(--accent)] text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-150 inline-flex items-center gap-1 shadow-2xs"
                                        >
                                            <span>Buka jurnal</span>
                                            <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {journals.links && journals.links.length > 3 && (
                        <div className="mt-8 pt-6 border-t border-[var(--separator)] flex items-center justify-center gap-1.5">
                            {journals.links.map((link, idx) => {
                                const isPrev = link.label.toLowerCase().includes('prev') || link.label.includes('Sebelumnya') || link.label.includes('&laquo;');
                                const isNext = link.label.toLowerCase().includes('next') || link.label.includes('Selanjutnya') || link.label.includes('&raquo;');
                                const cleanLabel = isPrev ? 'Sebelumnya' : isNext ? 'Selanjutnya' : link.label;

                                if (!link.url) {
                                    return (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 text-xs text-[var(--text-3)] rounded-md cursor-not-allowed select-none"
                                        >
                                            {cleanLabel}
                                        </span>
                                    );
                                }
                                return (
                                    <Link
                                        key={idx}
                                        href={link.url}
                                        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                                            link.active
                                                ? 'bg-[var(--accent,#0071E3)] text-white font-semibold'
                                                : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[#F5F5F7]'
                                        }`}
                                    >
                                        {cleanLabel}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

Journal.layout = getTeacherLayout;

