import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { getParentLayout } from '@/Layouts/ParentLayout';
import SegmentedControl from '@/Components/SegmentedControl';
import StatusCapsule from '@/Components/StatusCapsule';
import BottomSheet from '@/Components/BottomSheet';

type Student = {
    id: number;
    name: string;
    nis: string;
    classroom_name?: string;
};

type AssessmentItem = {
    aspect: string;
    level: string;
    note: string | null;
};

type JournalItem = {
    id: number;
    journal_date: string;
    journal_date_formatted: string;
    activity_summary: string;
    assessments: AssessmentItem[];
};

type AnecdoteItem = {
    id: number;
    noted_at: string;
    noted_at_formatted: string;
    observed_behavior: string;
    interpretation: string;
    follow_up: string | null;
    has_photo: boolean;
    photo_url: string | null;
};

type Props = {
    students: Student[];
    selectedStudent: Student | null;
    selectedStudentId: number | null;
    month: number;
    year: number;
    month_name: string;
    prev_month: { month: number; year: number };
    next_month: { month: number; year: number };
    journals: {
        data: JournalItem[];
    };
    anecdotes: {
        data: AnecdoteItem[];
    };
};

const ASPECT_LABELS: Record<string, string> = {
    nilai_agama_moral: 'Nilai Agama dan Budi Pekerti',
    fisik_motorik: 'Fisik Motorik',
    kognitif: 'Literasi dan STEAM / Kognitif',
    bahasa: 'Bahasa',
    sosial_emosional: 'Sosial Emosional & Jati Diri',
};

export default function Development({
    students = [],
    selectedStudent,
    selectedStudentId,
    month,
    year,
    month_name,
    prev_month,
    next_month,
    journals,
    anecdotes,
}: Props) {
    const pageProps = usePage().props as { appName?: string; schoolName?: string; schoolSettings?: Record<string, string> };
    const schoolName = pageProps.schoolName || pageProps.schoolSettings?.school_name || 'RA Waladun Sholeh';

    const [activeTab, setActiveTab] = useState<'jurnal' | 'anekdot'>('jurnal');
    const [isLegendOpen, setIsLegendOpen] = useState(false);
    const [isChildModalOpen, setIsChildModalOpen] = useState(false);

    const handleSwitchChild = (childId: number) => {
        setIsChildModalOpen(false);
        router.get('/ortu/perkembangan', { student_id: childId, month, year }, { preserveState: false });
    };

    return (
        <>
            <Head title="Perkembangan Anak" />

            <div className="space-y-6">
                {/* Header: Child Info & Actions */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-2">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-[var(--text-2)] font-semibold">
                            Perkembangan
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)] tracking-tight">
                                {selectedStudent?.name ?? 'Anak'}
                            </h1>
                            <span className="text-[var(--text-2)] text-base font-normal">
                                · {selectedStudent?.classroom_name ?? 'Kelompok A'}
                            </span>
                            {students.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setIsChildModalOpen(true)}
                                    className="text-[var(--accent)] text-sm font-semibold hover:underline ml-2"
                                >
                                    Ganti anak &gt;
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 self-start md:self-auto">
                        {/* Month Navigator */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[var(--border)] shadow-2xs">
                            <Link
                                href={`/ortu/perkembangan?student_id=${selectedStudentId}&month=${prev_month.month}&year=${prev_month.year}`}
                                className="text-[var(--text-2)] hover:text-[var(--text)] p-1 text-sm font-bold"
                                aria-label="Bulan sebelumnya"
                            >
                                &lt;
                            </Link>
                            <span className="text-sm font-semibold text-[var(--text)] px-1">
                                {month_name}
                            </span>
                            <Link
                                href={`/ortu/perkembangan?student_id=${selectedStudentId}&month=${next_month.month}&year=${next_month.year}`}
                                className="text-[var(--text-2)] hover:text-[var(--text)] p-1 text-sm font-bold"
                                aria-label="Bulan berikutnya"
                            >
                                &gt;
                            </Link>
                        </div>

                        {/* Download Report Link (Kept for Batch 3D) */}
                        {selectedStudentId && (
                            <a
                                href={`/ortu/perkembangan/${selectedStudentId}/laporan`}
                                className="text-[var(--accent)] text-sm font-semibold hover:underline"
                            >
                                Unduh laporan &gt;
                            </a>
                        )}
                    </div>
                </div>

                {/* Segmented Control Switcher & Legend Link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <SegmentedControl
                        options={[
                            { key: 'jurnal', label: 'Jurnal harian' },
                            { key: 'anekdot', label: 'Catatan anekdot' },
                        ]}
                        value={activeTab}
                        onChange={(val) => setActiveTab(val as 'jurnal' | 'anekdot')}
                    />

                    <button
                        type="button"
                        onClick={() => setIsLegendOpen(true)}
                        className="text-xs md:text-sm text-[var(--accent)] hover:underline self-start sm:self-auto font-medium"
                    >
                        Apa arti BB, MB, BSH, BSB?
                    </button>
                </div>

                {/* Tab 1: Jurnal Harian */}
                {activeTab === 'jurnal' && (
                    <div className="space-y-4">
                        {journals.data.length === 0 ? (
                            <div className="tile p-12 bg-white rounded-[28px] border border-[var(--border)] text-center text-[var(--text-2)] space-y-2">
                                <p className="font-semibold text-base text-[var(--text)]">
                                    Belum ada jurnal untuk {month_name}.
                                </p>
                                <p className="text-xs">
                                    Jurnal harian akan ditampilkan setelah difinalisasi oleh wali kelas.
                                </p>
                            </div>
                        ) : (
                            journals.data.map((journal) => (
                                <section
                                    key={journal.id}
                                    className="tile p-6 md:p-8 bg-white rounded-[28px] border border-[var(--border)] shadow-xs space-y-4"
                                >
                                    <div>
                                        <h2 className="text-lg md:text-xl font-bold text-[var(--text)]">
                                            {journal.journal_date_formatted}
                                        </h2>
                                        {journal.activity_summary && (
                                            <p className="text-sm text-[var(--text-2)] mt-1">
                                                Kegiatan hari ini: {journal.activity_summary}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        {journal.assessments.map((assessment, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3.5 rounded-2xl bg-[#F9F9FB] border border-[var(--border)] space-y-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-[var(--text)]">
                                                        {ASPECT_LABELS[assessment.aspect] ?? assessment.aspect}
                                                    </span>
                                                    <StatusCapsule status={assessment.level} />
                                                </div>
                                                {assessment.note && (
                                                    <p className="text-xs md:text-sm text-[var(--text-2)] leading-relaxed pt-0.5">
                                                        {assessment.note}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                )}

                {/* Tab 2: Catatan Anekdot */}
                {activeTab === 'anekdot' && (
                    <div className="space-y-4">
                        {anecdotes.data.length === 0 ? (
                            <div className="tile p-12 bg-white rounded-[28px] border border-[var(--border)] text-center text-[var(--text-2)] space-y-2">
                                <p className="font-semibold text-base text-[var(--text)]">
                                    Belum ada catatan anekdot untuk {month_name}.
                                </p>
                                <p className="text-xs">
                                    Catatan observasi perilaku khusus ananda akan muncul di sini bila ada dokumentasi dari guru.
                                </p>
                            </div>
                        ) : (
                            anecdotes.data.map((note) => (
                                <article
                                    key={note.id}
                                    className="tile p-6 md:p-8 bg-white rounded-[28px] border border-[var(--border)] shadow-xs space-y-4"
                                >
                                    <div className="border-b border-[var(--border)] pb-3">
                                        <span className="text-xs md:text-sm font-medium text-[var(--text-2)]">
                                            {note.noted_at_formatted}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-1">
                                            Perilaku yang teramati
                                        </p>
                                        <p className="text-sm md:text-[15px] text-[var(--text)] leading-relaxed">
                                            {note.observed_behavior}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-[#F5F5F7] rounded-2xl space-y-1">
                                        <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">
                                            Interpretasi guru
                                        </p>
                                        <p className="text-sm text-[var(--text)] leading-relaxed">
                                            {note.interpretation}
                                        </p>
                                    </div>

                                    {note.follow_up && (
                                        <div>
                                            <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-1">
                                                Tindak lanjut
                                            </p>
                                            <p className="text-sm text-[var(--text)] leading-relaxed">
                                                {note.follow_up}
                                            </p>
                                        </div>
                                    )}

                                    {note.has_photo && note.photo_url && (
                                        <div className="pt-2">
                                            <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-2">
                                                Lampiran Foto
                                            </p>
                                            <div className="relative inline-block rounded-xl overflow-hidden border border-[var(--border)] max-w-xs">
                                                <img
                                                    src={note.photo_url}
                                                    alt="Lampiran observasi anak"
                                                    className="max-h-48 object-cover rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </article>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal Legenda Skala Capaian */}
            <BottomSheet
                open={isLegendOpen}
                title="Arti Skala Penilaian Perkembangan"
                onClose={() => setIsLegendOpen(false)}
            >
                <div className="space-y-4 text-sm text-[var(--text)] mt-2">
                    <p className="text-xs text-[var(--text-2)]">
                        Sistem penilaian perkembangan anak usia dini di {schoolName} menggunakan empat tingkat capaian:
                    </p>

                    <div className="p-3.5 rounded-2xl bg-[#EEF2F8] border border-[#DCEAFE] space-y-1">
                        <div className="flex items-center gap-2">
                            <StatusCapsule status="BB" />
                            <span className="font-semibold text-xs text-[#31547A]">Belum Berkembang</span>
                        </div>
                        <p className="text-xs text-[var(--text-2)] leading-relaxed">
                            Anak melakukannya masih harus dengan bimbingan penuh atau dicontohkan secara langsung oleh guru.
                        </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#DCEAFE] border border-[#BFDBFE] space-y-1">
                        <div className="flex items-center gap-2">
                            <StatusCapsule status="MB" />
                            <span className="font-semibold text-xs text-[#235D9C]">Mulai Berkembang</span>
                        </div>
                        <p className="text-xs text-[var(--text-2)] leading-relaxed">
                            Anak melakukannya masih harus diingatkan atau dibantu secara berkala oleh guru.
                        </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#C9E2FC] border border-[#93C5FD] space-y-1">
                        <div className="flex items-center gap-2">
                            <StatusCapsule status="BSH" />
                            <span className="font-semibold text-xs text-[#0B6BC5]">Berkembang Sesuai Harapan</span>
                        </div>
                        <p className="text-xs text-[var(--text-2)] leading-relaxed">
                            Anak sudah dapat melakukannya secara mandiri dan konsisten tanpa harus diingatkan atau dicontohkan.
                        </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#EBF4FE] border border-[#0071E3] space-y-1">
                        <div className="flex items-center gap-2">
                            <StatusCapsule status="BSB" />
                            <span className="font-semibold text-xs text-[#0071E3]">Berkembang Sangat Baik</span>
                        </div>
                        <p className="text-xs text-[var(--text-2)] leading-relaxed">
                            Anak sudah dapat melakukannya secara mandiri dan mampu membantu atau memotivasi temannya yang belum mencapai kemampuan tersebut.
                        </p>
                    </div>

                    <div className="pt-2 text-right">
                        <button
                            type="button"
                            onClick={() => setIsLegendOpen(false)}
                            className="bg-[var(--accent,#0071E3)] text-white text-xs px-5 py-2 rounded-full font-semibold hover:bg-[#0077ED]"
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            </BottomSheet>

            {/* Modal Ganti Anak (jika ada lebih dari 1 anak) */}
            <BottomSheet
                open={isChildModalOpen}
                title="Pilih Anak"
                onClose={() => setIsChildModalOpen(false)}
            >
                <div className="space-y-2 mt-2">
                    <p className="text-xs text-[var(--text-2)] mb-3">
                        Pilih data ananda yang ingin Anda lihat laporannya:
                    </p>
                    {students.map((child) => (
                        <button
                            key={child.id}
                            type="button"
                            onClick={() => handleSwitchChild(child.id)}
                            className={`w-full p-3.5 rounded-2xl flex items-center justify-between border transition-all text-left ${
                                selectedStudentId === child.id
                                    ? 'border-[var(--accent)] bg-[#EBF4FE] font-semibold text-[var(--accent)]'
                                    : 'border-[var(--border)] hover:bg-[#F5F5F7] text-[var(--text)]'
                            }`}
                        >
                            <div>
                                <p className="text-sm font-semibold">{child.name}</p>
                                <p className="text-xs text-[var(--text-2)]">NIS {child.nis}</p>
                            </div>
                            {selectedStudentId === child.id && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)] text-white">
                                    Aktif
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </BottomSheet>
        </>
    );
}

Development.layout = getParentLayout;

