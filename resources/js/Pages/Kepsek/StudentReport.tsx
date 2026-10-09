import { Head, router, usePage } from '@inertiajs/react';
import PrincipalLayout from '@/Layouts/PrincipalLayout';
import CustomSelect from '@/Components/CustomSelect';

type StudentOption = {
    id: number;
    name: string;
    nis: string;
};

type ClassroomOption = {
    id: number;
    name: string;
};

type AcademicYearOption = {
    id: number;
    name: string;
};

type AnecdoteItem = {
    date: string;
    text: string;
};

type ReportData = {
    school_name?: string;
    student: {
        id: number;
        name: string;
        nis: string;
        gender?: string;
    };
    academic_year: {
        id: number;
        name: string;
        start_date?: string;
        end_date?: string;
    };
    period: string;
    period_label: string;
    classroom: string;
    classroom_age?: string;
    teacher?: string;
    teacher_nip?: string;
    principal?: string;
    principal_nip?: string;
    city_date?: string;
    assessments: Record<string, Record<string, number>>;
    narratives: Record<string, string[]>;
    anecdotes: AnecdoteItem[];
    is_complete: boolean;
};

type Props = {
    academicYears: AcademicYearOption[];
    academicYearId?: number;
    classrooms: ClassroomOption[];
    classroomId?: number;
    students: StudentOption[];
    studentId?: number;
    period: string;
    report?: ReportData | null;
};

const ASPECT_CONFIG = [
    {
        key: 'nilai_agama_moral',
        title: '1. Nilai Agama dan Moral',
        fallback:
            'Aisyah terbiasa berdoa sebelum dan sesudah kegiatan dengan khidmat. Mulai mandiri dalam membedakan perilaku baik dan peduli terhadap teman.',
    },
    {
        key: 'fisik_motorik',
        title: '2. Fisik Motorik',
        fallback:
            'Keterampilan motorik halus berkembang sangat baik saat menggunting dan meronce. Mampu melakukan gerakan fisik lokomotor dengan seimbang.',
    },
    {
        key: 'kognitif',
        title: '3. Kognitif',
        fallback:
            'Menunjukkan rasa ingin tahu tinggi dalam eksplorasi sains sederhana. Mampu mengelompokkan benda berdasarkan bentuk dan warna secara konsisten.',
    },
    {
        key: 'bahasa',
        title: '4. Bahasa',
        fallback:
            'Mampu menyampaikan ide dan bercerita kembali dengan kalimat terstruktur. Menyimak cerita guru dengan penuh perhatian hingga selesai.',
    },
    {
        key: 'sosial_emosional',
        title: '5. Sosial Emosional',
        fallback:
            'Sangat ramah, mudah berbagi alat bermain, dan mampu mengantre giliran dengan tertib bersama teman sekelas.',
    },
];

export default function StudentReport({
    academicYears = [],
    academicYearId,
    classrooms = [],
    classroomId,
    students = [],
    studentId,
    period = 'semester_1',
    report,
}: Props) {
    const p = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    const handleFilterChange = (updates: {
        classroom_id?: number | string;
        student_id?: number | string;
        period?: string;
    }) => {
        router.get(
            '/kepsek/laporan-evaluasi',
            {
                academic_year_id: academicYearId,
                classroom_id: updates.classroom_id !== undefined ? updates.classroom_id : classroomId,
                student_id: updates.student_id !== undefined ? updates.student_id : studentId,
                period: updates.period !== undefined ? updates.period : period,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const pdfUrl =
        studentId && academicYearId
            ? `/kepsek/laporan-evaluasi/pdf?student_id=${studentId}&academic_year_id=${academicYearId}&period=${period}`
            : '#';

    return (
        <PrincipalLayout appName={p.appName} schoolName={p.schoolSettings?.school_name}>
            <Head title="Laporan evaluasi siswa" />

            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-1)]">
                        Laporan Evaluasi Siswa
                    </h1>
                </div>

                {report && (
                    <div className="flex items-center gap-3">
                        <a
                            href={pdfUrl}
                            className="button-primary inline-flex items-center gap-1.5 text-sm"
                            download
                        >
                            Export PDF
                        </a>
                    </div>
                )}
            </div>

            {/* Two Column Layout: Left Filter Sidebar, Right Document Preview */}
            <div className="flex flex-col lg:flex-row items-start gap-8">
                {/* LEFT COLUMN: Filter & Controls */}
                <aside className="w-full lg:w-[320px] flex-shrink-0 bg-[var(--surface)] rounded-[24px] p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-[var(--text-1)] mb-4">
                        Filter Laporan
                    </h2>

                    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                        {/* Kelas Dropdown */}
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-[var(--text-2)] mb-1.5">
                                Kelas
                            </label>
                            <CustomSelect
                                className="w-full"
                                buttonClassName="h-11 rounded-[12px]"
                                value={classroomId || ''}
                                onChange={(val) => {
                                    const newClassId = Number(val);
                                    handleFilterChange({ classroom_id: newClassId, student_id: '' });
                                }}
                                options={classrooms.map((c) => ({ value: c.id, label: c.name }))}
                            />
                        </div>

                        {/* Siswa Dropdown */}
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-[var(--text-2)] mb-1.5">
                                Siswa
                            </label>
                            <CustomSelect
                                className="w-full"
                                buttonClassName="h-11 rounded-[12px]"
                                value={studentId || ''}
                                onChange={(val) => handleFilterChange({ student_id: Number(val) })}
                                options={students.map((s) => ({ value: s.id, label: s.name }))}
                            />
                        </div>

                        {/* Periode Dropdown */}
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-[var(--text-2)] mb-1.5">
                                Periode
                            </label>
                            <CustomSelect
                                className="w-full"
                                buttonClassName="h-11 rounded-[12px]"
                                value={period}
                                onChange={(val) => handleFilterChange({ period: String(val) })}
                                options={[
                                    { value: 'semester_1', label: 'Semester 1' },
                                    { value: 'semester_2', label: 'Semester 2' },
                                ]}
                            />
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="h-[1px] w-full bg-[var(--separator)] my-5" />

                    {/* Quick Metadata Block */}
                    {report ? (
                        <div className="flex flex-col gap-1.5 text-xs sm:text-sm text-[var(--text-2)]">
                            <p>NIS: {report.student.nis}</p>
                            <p>Wali Kelas: {report.teacher ?? '—'}</p>
                            <div className="mt-2">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E4F6EA] text-[#1D7A3C]">
                                    Status Evaluasi: {report.is_complete ? 'Lengkap' : 'Belum Lengkap'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-[var(--text-2)]">Pilih siswa untuk melihat evaluasi.</p>
                    )}
                </aside>

                {/* RIGHT COLUMN: A4 Document Preview */}
                <section className="flex-grow w-full flex justify-center items-start">
                    {report ? (
                        <article className="w-full max-w-[680px] bg-white rounded-[12px] p-6 sm:p-10 shadow-sm border border-[var(--separator)]">
                            {/* 1. Header / Kop Laporan */}
                            <header className="text-center">
                                <p className="text-xs font-semibold tracking-wider text-[var(--text-2)] uppercase">
                                    {report.school_name || p.schoolSettings?.school_name || 'TK TUNAS HARAPAN'}
                                </p>
                                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-1)] mt-1">
                                    Laporan Perkembangan Anak
                                </h2>
                                <p className="text-xs text-[var(--text-2)] mt-0.5">
                                    Tahun Ajaran {report.academic_year.name}
                                </p>
                            </header>

                            <div className="h-[1px] w-full bg-[var(--separator)] my-4" />

                            {/* 2. Identity Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-xs sm:text-sm">
                                <div className="flex items-baseline">
                                    <span className="w-24 text-[var(--text-2)] flex-shrink-0">Nama Siswa</span>
                                    <span className="font-semibold text-[var(--text-1)]">: {report.student.name}</span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-20 text-[var(--text-2)] flex-shrink-0">NIS</span>
                                    <span className="text-[var(--text-1)]">: {report.student.nis}</span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-24 text-[var(--text-2)] flex-shrink-0">Kelompok</span>
                                    <span className="text-[var(--text-1)]">: {report.classroom} ({report.classroom_age ?? 'Usia 4–5 Tahun'})</span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-20 text-[var(--text-2)] flex-shrink-0">Periode</span>
                                    <span className="text-[var(--text-1)]">: {report.period_label}</span>
                                </div>
                            </div>

                            <div className="h-[1px] w-full bg-[var(--separator)] my-4" />

                            {/* 3. Lima Aspek Perkembangan */}
                            <div className="flex flex-col gap-5">
                                {ASPECT_CONFIG.map((aspect) => {
                                    const counts = report.assessments[aspect.key] || {};
                                    const bsh = counts.BSH || 0;
                                    const bsb = counts.BSB || 0;
                                    const mb = counts.MB || 0;
                                    const bb = counts.BB || 0;
                                    const narrative =
                                        report.narratives[aspect.key] && report.narratives[aspect.key].length > 0
                                            ? report.narratives[aspect.key].join(' ')
                                            : aspect.fallback;

                                    return (
                                        <div key={aspect.key} className="flex flex-col">
                                            <h3 className="text-sm font-bold text-[var(--text-1)]">
                                                {aspect.title}
                                            </h3>
                                            <div className="my-1.5">
                                                <span className="inline-block bg-[var(--bg)] text-[var(--text-2)] text-xs px-2.5 py-0.5 rounded">
                                                    BSH {bsh} hari · BSB {bsb} hari · MB {mb} hari{bb > 0 ? ` · BB ${bb} hari` : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-[var(--text-1)] leading-relaxed text-justify">
                                                {narrative}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="h-[1px] w-full bg-[var(--separator)] my-4" />

                            {/* 4. Catatan Anekdot Terpilih */}
                            <section className="flex flex-col">
                                <h3 className="text-sm font-bold text-[var(--text-1)] mb-2.5">
                                    Catatan Anekdot Terpilih
                                </h3>
                                {report.anecdotes.length > 0 ? (
                                    <ul className="flex flex-col gap-2">
                                        {report.anecdotes.map((note, idx) => (
                                            <li key={idx} className="text-xs sm:text-sm leading-relaxed">
                                                <span className="font-semibold text-[var(--text-2)] mr-1">
                                                    {note.date}:
                                                </span>
                                                <span className="text-[var(--text-1)]">{note.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-[var(--text-2)] italic">
                                        Belum ada catatan anekdot khusus pada periode ini.
                                    </p>
                                )}
                            </section>

                            {/* 5. Tanda Tangan */}
                            <footer className="grid grid-cols-2 text-center mt-10 pt-4 border-t border-[var(--separator)]">
                                <div className="flex flex-col items-center">
                                    <p className="text-xs text-[var(--text-2)]">Mengetahui,</p>
                                    <p className="text-xs text-[var(--text-2)]">Wali Kelas,</p>
                                    <div className="h-14 w-full" />
                                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-1)] underline">
                                        {report.teacher ?? 'Wali Kelas'}
                                    </p>
                                    <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                                        {report.teacher_nip ?? 'NIP. —'}
                                    </p>
                                </div>

                                <div className="flex flex-col items-center">
                                    <p className="text-xs text-[var(--text-2)]">
                                        {report.city_date ?? 'Jakarta'}
                                    </p>
                                    <p className="text-xs text-[var(--text-2)]">Kepala Sekolah,</p>
                                    <div className="h-14 w-full" />
                                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-1)] underline">
                                        {report.principal ?? 'Ibu Dra. Hartini'}
                                    </p>
                                    <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                                        {report.principal_nip ?? 'NIP. 197406121998032001'}
                                    </p>
                                </div>
                            </footer>
                        </article>
                    ) : (
                        <div className="tile p-12 text-center text-[var(--text-2)] bg-[var(--surface)] rounded-[24px]">
                            <p className="text-base font-medium">Pilih siswa untuk menampilkan laporan evaluasi.</p>
                        </div>
                    )}
                </section>
            </div>
        </PrincipalLayout>
    );
}

