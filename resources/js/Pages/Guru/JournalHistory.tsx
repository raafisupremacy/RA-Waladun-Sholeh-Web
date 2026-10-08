import { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import TeacherLayout from '@/Layouts/TeacherLayout';
import StatusCapsule from '@/Components/StatusCapsule';

type AspectKey = 'nilai_agama_moral' | 'fisik_motorik' | 'kognitif' | 'bahasa' | 'sosial_emosional';

const ASPECTS: { key: AspectKey; label: string }[] = [
    { key: 'nilai_agama_moral', label: 'Nilai Agama dan Moral' },
    { key: 'fisik_motorik', label: 'Fisik Motorik' },
    { key: 'kognitif', label: 'Kognitif' },
    { key: 'bahasa', label: 'Bahasa' },
    { key: 'sosial_emosional', label: 'Sosial Emosional' },
];

type SchoolDay = {
    date: string;
    day_name: string;
    day_number: number;
    is_past_or_today: boolean;
};

type AssessmentItem = {
    level: string;
    note: string;
};

type JournalEntry = {
    id: number;
    activity_summary: string;
    status: string;
    finalized_at: string | null;
    assessments: Record<string, AssessmentItem>;
};

type Props = {
    classroom: {
        id: number;
        name: string;
    } | null;
    students: { id: number; name: string; nis: string }[];
    selected_student: { id: number; name: string; nis: string } | null;
    month: number;
    year: number;
    month_name: string;
    aspect_filter: string;
    school_days: SchoolDay[];
    journals_by_date: Record<string, JournalEntry>;
    stats: {
        filled_days: number;
        total_days: number;
        attendance_percent: number;
        dominant_level: string;
    };
};

export default function JournalHistory({
    classroom,
    students = [],
    selected_student,
    month,
    year,
    month_name,
    aspect_filter = 'all',
    school_days = [],
    journals_by_date = {},
    stats,
}: Props) {
    const pageProps = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    // Default selected day to the last school day that has journal or first day
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const filled = school_days.filter((d) => journals_by_date[d.date]);
        return filled.length > 0 ? filled[filled.length - 1].date : (school_days[0]?.date ?? '');
    });

    const [currentAspectFilter, setCurrentAspectFilter] = useState<string>(aspect_filter);

    const handleStudentChange = (studentId: number) => {
        router.get('/guru/riwayat', {
            student_id: studentId,
            month,
            year,
            aspect: currentAspectFilter,
        }, { preserveState: false });
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const [m, y] = e.target.value.split('-').map(Number);
        router.get('/guru/riwayat', {
            student_id: selected_student?.id,
            month: m,
            year: y,
            aspect: currentAspectFilter,
        }, { preserveState: false });
    };

    const handleAspectFilterChange = (aspect: string) => {
        setCurrentAspectFilter(aspect);
    };

    const displayedAspects = useMemo(() => {
        if (currentAspectFilter === 'all') return ASPECTS;
        return ASPECTS.filter((a) => a.key === currentAspectFilter);
    }, [currentAspectFilter]);

    const activeJournal = selectedDate ? journals_by_date[selectedDate] : null;

    return (
        <TeacherLayout
            appName={pageProps.appName}
            schoolName={pageProps.schoolSettings?.school_name}
        >
            <Head title="Riwayat Jurnal" />

            <div className="page-content space-y-6">
                {/* Header: Eyebrow, Title, Stats */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-[var(--text-2)] font-semibold">
                            Riwayat Jurnal Harian · {classroom?.name ?? 'Kelas'}
                        </p>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text)] mt-1">
                            {month_name}
                        </h1>
                    </div>

                    <div className="text-right">
                        <p className="text-xl md:text-2xl font-bold text-[var(--text)]">
                            Hari terisi {stats.filled_days} dari {stats.total_days}
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="tile p-4 md:p-6 bg-white rounded-2xl border border-[var(--border)] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Student Dropdown */}
                        <select
                            value={selected_student?.id ?? ''}
                            onChange={(e) => handleStudentChange(Number(e.target.value))}
                            className="text-sm font-semibold rounded-full border border-[var(--border)] px-4 py-2 bg-[#F5F5F7] focus:bg-white focus:ring-[var(--accent)]"
                        >
                            {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} (NIS {s.nis})
                                </option>
                            ))}
                        </select>

                        {/* Month Selector */}
                        <select
                            value={`${month}-${year}`}
                            onChange={handleMonthChange}
                            className="text-sm font-semibold rounded-full border border-[var(--border)] px-4 py-2 bg-[#F5F5F7] focus:bg-white focus:ring-[var(--accent)]"
                        >
                            <option value="10-2026">Oktober 2026</option>
                            <option value="9-2026">September 2026</option>
                            <option value="8-2026">Agustus 2026</option>
                            <option value="7-2026">Juli 2026</option>
                        </select>

                        {/* Aspect Filter */}
                        <select
                            value={currentAspectFilter}
                            onChange={(e) => handleAspectFilterChange(e.target.value)}
                            className="text-sm font-semibold rounded-full border border-[var(--border)] px-4 py-2 bg-[#F5F5F7] focus:bg-white focus:ring-[var(--accent)]"
                        >
                            <option value="all">Semua Aspek Perkembangan</option>
                            {ASPECTS.map((a) => (
                                <option key={a.key} value={a.key}>
                                    {a.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="text-xs text-[var(--text-2)] font-medium self-end md:self-auto">
                        Kehadiran: <span className="font-bold text-[var(--text)]">{stats.attendance_percent}%</span> · Capaian Dominan: <span className="font-bold text-[var(--text)]">{stats.dominant_level}</span>
                    </div>
                </div>

                {/* Scale Legend Pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[var(--text-2)] font-medium mr-1">Skala Capaian:</span>
                    <span className="status status-bb">BB Belum Berkembang</span>
                    <span className="status status-mb">MB Mulai Berkembang</span>
                    <span className="status status-bsh">BSH Berkembang Sesuai Harapan</span>
                    <span className="status status-bsb">BSB Berkembang Sangat Baik</span>
                    <span className="text-[var(--text-2)] px-2.5 py-1 rounded-full bg-[#EEEEF1] font-semibold">
                        – Tidak Ada Data / Terlewat
                    </span>
                </div>

                {/* Main Content Layout: Matrix (Left) & Day Detail Panel (Right) */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Matrix View (Desktop & Tablet) */}
                    <div className="flex-1 min-w-0 tile p-6 md:p-8 bg-white rounded-[28px] border border-[var(--border)] shadow-xs">
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
                            <h2 className="text-lg font-bold text-[var(--text)]">
                                Matriks Aspek Perkembangan
                            </h2>
                            <span className="text-xs px-3 py-1 bg-[#F5F5F7] text-[var(--text-2)] rounded-full font-medium">
                                1 – {school_days.length} {month_name} (Hari Efektif)
                            </span>
                        </div>

                        {/* Scrollable Table for Desktop Matrix */}
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left border-collapse min-w-[650px]">
                                <thead>
                                    <tr>
                                        <th className="py-3 px-3 text-xs font-semibold text-[var(--text-2)] w-48 sticky left-0 bg-white">
                                            Aspek Perkembangan
                                        </th>
                                        {school_days.map((day) => {
                                            const isSelected = selectedDate === day.date;
                                            return (
                                                <th
                                                    key={day.date}
                                                    onClick={() => setSelectedDate(day.date)}
                                                    className={`py-2 px-1 text-center cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-[#EBF4FE] rounded-t-xl' : 'hover:bg-[#F5F5F7]'
                                                    }`}
                                                >
                                                    <div className={`text-[11px] font-medium ${isSelected ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-2)]'}`}>
                                                        {day.day_name}
                                                    </div>
                                                    <div className={`text-xs font-bold ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                                                        {day.day_number}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedAspects.map((aspect) => (
                                        <tr key={aspect.key} className="border-t border-[var(--border)]">
                                            <td className="py-3.5 px-3 text-xs md:text-sm font-semibold text-[var(--text)] sticky left-0 bg-white">
                                                {aspect.label}
                                            </td>
                                            {school_days.map((day) => {
                                                const journal = journals_by_date[day.date];
                                                const assessment = journal?.assessments?.[aspect.key];
                                                const level = assessment?.level;
                                                const isSelected = selectedDate === day.date;

                                                return (
                                                    <td
                                                        key={day.date}
                                                        onClick={() => setSelectedDate(day.date)}
                                                        className={`py-2 px-1 text-center cursor-pointer transition-colors ${
                                                            isSelected ? 'bg-[#EBF4FE]' : 'hover:bg-[#F5F5F7]'
                                                        }`}
                                                    >
                                                        {level ? (
                                                            <span className={`status status-${level.toLowerCase()} text-[11px] px-2 py-0.5 min-h-[24px]`}>
                                                                {level}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[var(--text-3)] text-xs">–</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="text-xs text-[var(--text-2)] pt-2 border-t border-[var(--border)]">
                            Hari terlewat (–) menandakan siswa izin/sakit atau jurnal belum difinalisasi.
                        </p>
                    </div>

                    {/* Right Panel: Day Detail */}
                    <div className="w-full lg:w-96 shrink-0 tile p-6 md:p-8 bg-white rounded-[28px] border border-[var(--border)] shadow-xs space-y-5">
                        <div className="border-b border-[var(--border)] pb-3">
                            <p className="text-xs text-[var(--text-2)] uppercase font-semibold">
                                Detail Jurnal Harian
                            </p>
                            <h3 className="text-lg font-bold text-[var(--text)] mt-0.5">
                                {selectedDate
                                    ? new Date(selectedDate).toLocaleDateString('id-ID', {
                                          weekday: 'long',
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                      })
                                    : 'Pilih Hari'}
                            </h3>
                            <p className="text-xs text-[var(--text-2)] mt-0.5">
                                {selected_student?.name} · NIS {selected_student?.nis} · {classroom?.name}
                            </p>
                        </div>

                        {activeJournal ? (
                            <div className="space-y-4">
                                {/* Kegiatan Hari Ini */}
                                <div className="p-4 bg-[#F5F5F7] rounded-2xl">
                                    <p className="text-xs uppercase tracking-wider font-semibold text-[var(--text-2)] mb-1">
                                        Kegiatan Hari Ini
                                    </p>
                                    <p className="text-sm text-[var(--text)] leading-relaxed">
                                        {activeJournal.activity_summary || 'Tidak ada ringkasan kegiatan.'}
                                    </p>
                                </div>

                                {/* Assessments */}
                                <div className="space-y-3">
                                    {ASPECTS.map((aspect) => {
                                        const assessment = activeJournal.assessments?.[aspect.key];
                                        return (
                                            <div key={aspect.key} className="p-3.5 border border-[var(--border)] rounded-2xl space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-[var(--text)]">
                                                        {aspect.label}
                                                    </span>
                                                    {assessment?.level ? (
                                                        <StatusCapsule status={assessment.level} />
                                                    ) : (
                                                        <span className="text-xs text-[var(--text-3)]">–</span>
                                                    )}
                                                </div>
                                                {assessment?.note && (
                                                    <p className="text-xs text-[var(--text-2)] leading-normal pt-1">
                                                        {assessment.note}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-2">
                                    <Link
                                        href={`/guru/jurnal/${selected_student?.id}?date=${selectedDate}`}
                                        className="text-[var(--accent)] text-sm font-semibold hover:underline block text-center"
                                    >
                                        Ubah jurnal hari ini &gt;
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center space-y-3">
                                <p className="text-sm text-[var(--text-2)]">
                                    Belum ada jurnal untuk tanggal ini.
                                </p>
                                {selected_student && selectedDate && (
                                    <Link
                                        href={`/guru/jurnal/${selected_student.id}?date=${selectedDate}`}
                                        className="button-secondary text-xs inline-block"
                                    >
                                        Isi jurnal tanggal ini &gt;
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TeacherLayout>
    );
}
