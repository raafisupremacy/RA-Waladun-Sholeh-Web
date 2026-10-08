import { useState, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import TeacherLayout from '@/Layouts/TeacherLayout';
import BigNumber from '@/Components/BigNumber';
import StatusCapsule from '@/Components/StatusCapsule';
import SegmentedControl from '@/Components/SegmentedControl';
import EmptyState from '@/Components/EmptyState';

type StudentItem = {
    id: number;
    name: string;
    nis: string;
    initials: string;
    is_filled: boolean;
    status: 'sudah_diisi' | 'belum_diisi';
    status_label: string;
    journal_id: number | null;
    journal_status: string | null;
};

type Props = {
    classroom: {
        id: number;
        name: string;
        academic_year: string;
    } | null;
    date: string;
    raw_date: string;
    filled: number;
    total: number;
    progress_percentage: number;
    students: StudentItem[];
};

export default function Dashboard({
    classroom,
    date,
    filled,
    total,
    progress_percentage,
    students = [],
}: Props) {
    const pageProps = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };
    const [filter, setFilter] = useState<'semua' | 'belum_diisi' | 'sudah_diisi'>('semua');

    const unfilledCount = total - filled;

    const filteredStudents = useMemo(() => {
        if (filter === 'belum_diisi') {
            return students.filter((s) => !s.is_filled);
        }
        if (filter === 'sudah_diisi') {
            return students.filter((s) => s.is_filled);
        }
        return students;
    }, [students, filter]);

    const filterOptions = [
        { key: 'semua', label: 'Semua' },
        { key: 'belum_diisi', label: `Belum diisi ${unfilledCount}` },
        { key: 'sudah_diisi', label: `Sudah diisi ${filled}` },
    ];

    return (
        <TeacherLayout
            appName={pageProps.appName}
            schoolName={pageProps.schoolSettings?.school_name}
        >
            <Head title="Beranda Guru" />

            <div className="page-content space-y-6">
                {/* Hero Tile: Class Title, Date, Progress */}
                <section className="tile p-8 md:p-12 bg-white rounded-[28px] border border-[var(--border)] shadow-xs">
                    <p className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text)]">
                        {classroom?.name ?? 'Wali Kelas'}
                    </p>
                    <p className="text-[var(--text-2)] text-base md:text-lg mt-1 font-normal">
                        {date}
                    </p>

                    <div className="mt-8">
                        <BigNumber label="jurnal hari ini terisi">
                            {filled} dari {total}
                        </BigNumber>

                        {/* Progress Bar */}
                        <div className="w-full max-w-md h-2 bg-[#E5E5EA] rounded-full overflow-hidden mt-4">
                            <div
                                className="h-full bg-[var(--accent,#0071E3)] rounded-full transition-all duration-300"
                                style={{ width: `${progress_percentage}%` }}
                            />
                        </div>
                    </div>
                </section>

                {/* Main Content: Filter & Student Grid */}
                <section className="tile p-6 md:p-8 bg-white rounded-[28px] border border-[var(--border)] shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[var(--border)]">
                        <SegmentedControl
                            options={filterOptions}
                            value={filter}
                            onChange={(val) => setFilter(val as 'semua' | 'belum_diisi' | 'sudah_diisi')}
                        />
                        <div className="text-sm text-[var(--text-2)] font-medium">
                            {classroom?.academic_year ?? 'Tahun Ajaran Aktif'}
                        </div>
                    </div>

                    {!classroom ? (
                        <div className="py-12">
                            <EmptyState>
                                Anda belum ditugaskan sebagai wali kelas pada tahun ajaran aktif.
                            </EmptyState>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-12">
                            <EmptyState>
                                {filter === 'semua'
                                    ? 'Belum ada siswa terdaftar pada kelas ini.'
                                    : filter === 'belum_diisi'
                                    ? 'Semua jurnal siswa sudah diisi hari ini.'
                                    : 'Belum ada jurnal yang diisi hari ini.'}
                            </EmptyState>
                        </div>
                    ) : (
                        <div className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                {filteredStudents.map((student) => (
                                    <div
                                        key={student.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl hover:bg-[#F5F5F7] transition-colors border border-[var(--border)] sm:border-transparent sm:hover:border-[var(--border)]"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-11 h-11 rounded-full bg-[#EBF4FE] text-[var(--accent)] font-semibold text-sm flex items-center justify-center shrink-0">
                                                {student.initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-[15px] text-[var(--text)] truncate">
                                                    {student.name}
                                                </p>
                                                <p className="text-xs text-[var(--text-2)] mt-0.5">
                                                    NIS {student.nis}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 ml-14 sm:ml-0 pt-1 sm:pt-0 border-t border-[var(--border)] sm:border-t-0">
                                            <StatusCapsule
                                                status={student.status}
                                                label={student.status_label}
                                            />
                                            <Link
                                                href={`/guru/jurnal/${student.id}`}
                                                className="text-[var(--accent)] text-sm font-semibold hover:underline flex items-center gap-1"
                                            >
                                                Isi jurnal &gt;
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-[var(--border)] text-center text-xs text-[var(--text-2)]">
                                Menampilkan {filteredStudents.length} dari {total} siswa · {classroom.name}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </TeacherLayout>
    );
}
