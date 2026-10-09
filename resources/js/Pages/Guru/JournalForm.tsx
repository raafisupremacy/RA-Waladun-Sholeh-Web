import { useState, useEffect, useRef, useCallback } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';
import axios from 'axios';
import { getTeacherLayout } from '@/Layouts/TeacherLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import SegmentedControl from '@/Components/SegmentedControl';

type AspectKey = 'nilai_agama_moral' | 'fisik_motorik' | 'kognitif' | 'bahasa' | 'sosial_emosional';

const ASPECTS: { key: AspectKey; label: string }[] = [
    { key: 'nilai_agama_moral', label: 'Nilai Agama dan Moral' },
    { key: 'fisik_motorik', label: 'Fisik Motorik' },
    { key: 'kognitif', label: 'Kognitif' },
    { key: 'bahasa', label: 'Bahasa' },
    { key: 'sosial_emosional', label: 'Sosial Emosional' },
];

const LEVEL_OPTIONS = [
    { key: 'BB', label: 'BB' },
    { key: 'MB', label: 'MB' },
    { key: 'BSH', label: 'BSH' },
    { key: 'BSB', label: 'BSB' },
];

type AssessmentItem = {
    level: string;
    note: string;
};

type Props = {
    student: {
        id: number;
        name: string;
        nis: string;
    };
    classroom: {
        id: number;
        name: string;
    } | null;
    date: string;
    date_formatted: string;
    journal: {
        id: number;
        activity_summary: string;
        status: string;
        finalized_at: string | null;
        assessments: Record<string, AssessmentItem>;
    } | null;
    is_locked: boolean;
    can_edit: boolean;
    locked_until_date: string | null;
    prev_student: { id: number; name: string } | null;
    next_student: { id: number; name: string } | null;
};

export default function JournalForm({
    student,
    classroom,
    date,
    date_formatted,
    journal,
    is_locked,
    can_edit,
    locked_until_date,
    prev_student,
    next_student,
}: Props) {
    const pageProps = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    const [selectedDate, setSelectedDate] = useState(date);
    const [activitySummary, setActivitySummary] = useState(journal?.activity_summary ?? '');
    const [assessments, setAssessments] = useState<Record<AspectKey, AssessmentItem>>(() => {
        const initial: Record<AspectKey, AssessmentItem> = {
            nilai_agama_moral: { level: '', note: '' },
            fisik_motorik: { level: '', note: '' },
            kognitif: { level: '', note: '' },
            bahasa: { level: '', note: '' },
            sosial_emosional: { level: '', note: '' },
        };
        if (journal?.assessments) {
            for (const asp of ASPECTS) {
                if (journal.assessments[asp.key]) {
                    initial[asp.key] = {
                        level: journal.assessments[asp.key].level || '',
                        note: journal.assessments[asp.key].note || '',
                    };
                }
            }
        }
        return initial;
    });

    const isFinalized = journal?.status === 'final';
    const [isEditingUnlocked, setIsEditingUnlocked] = useState(!isFinalized);
    const [savedNotice, setSavedNotice] = useState<string | null>(
        isFinalized ? `Tersimpan pada ${date_formatted}` : null
    );
    const [validationErrors, setValidationErrors] = useState<Partial<Record<AspectKey, string>>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isFirstRender = useRef(true);

    const isReadOnly = is_locked || (!isEditingUnlocked && isFinalized);

    const handleLevelChange = (aspect: AspectKey, level: string) => {
        if (isReadOnly) return;
        setAssessments((prev) => ({
            ...prev,
            [aspect]: { ...prev[aspect], level },
        }));
        setValidationErrors((prev) => {
            const next = { ...prev };
            delete next[aspect];
            return next;
        });
        if (generalError) setGeneralError(null);
    };

    const handleNoteChange = (aspect: AspectKey, note: string) => {
        if (isReadOnly) return;
        setAssessments((prev) => ({
            ...prev,
            [aspect]: { ...prev[aspect], note },
        }));
    };

    // Autosave handler (debounced)
    const triggerAutoSave = useCallback(() => {
        if (isReadOnly || !classroom) return;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(async () => {
            try {
                const res = await axios.post('/guru/jurnal', {
                    id: journal?.id,
                    student_id: student.id,
                    classroom_id: classroom.id,
                    journal_date: selectedDate,
                    activity_summary: activitySummary,
                    assessments: assessments,
                });
                if (res.data?.saved_at) {
                    setSavedNotice(`Tersimpan otomatis ${res.data.saved_at}`);
                }
            } catch {
                // Ignore silent autosave errors
            }
        }, 1500);
    }, [activitySummary, assessments, classroom, isReadOnly, journal, selectedDate, student.id]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        triggerAutoSave();
    }, [activitySummary, assessments, triggerAutoSave]);

    const handleManualSaveDraft = async () => {
        if (isReadOnly || !classroom) return;
        setIsSubmitting(true);
        try {
            await axios.post('/guru/jurnal', {
                id: journal?.id,
                student_id: student.id,
                classroom_id: classroom.id,
                journal_date: selectedDate,
                activity_summary: activitySummary,
                assessments: assessments,
            });
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;
            setSavedNotice(`Tersimpan otomatis ${timeStr}`);
            router.reload({ only: ['journal'] });
        } catch {
            setGeneralError('Gagal menyimpan draf. Periksa koneksi Anda.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalize = () => {
        if (isReadOnly || !classroom) return;

        // Client-side validation: all 5 aspects must have a selected level
        const errors: Partial<Record<AspectKey, string>> = {};
        for (const asp of ASPECTS) {
            if (!assessments[asp.key].level) {
                errors[asp.key] = `Pilih penilaian untuk ${asp.label}`;
            }
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setGeneralError('Mohon lengkapi penilaian wajib');
            return;
        }

        setIsSubmitting(true);
        // First ensure draft is saved/updated, then finalize
        axios.post('/guru/jurnal', {
            id: journal?.id,
            student_id: student.id,
            classroom_id: classroom.id,
            journal_date: selectedDate,
            activity_summary: activitySummary,
            assessments: assessments,
        })
        .then((draftRes) => {
            const journalId = draftRes.data?.journal_id || journal?.id;
            return axios.post(`/guru/jurnal/${journalId}/final`, {
                activity_summary: activitySummary,
                assessments: assessments,
            });
        })
        .then(() => {
            router.visit(`/guru?saved_student=${encodeURIComponent(student.name)}`);
        })
        .catch((err) => {
            setGeneralError(err.response?.data?.message || 'Gagal menyimpan jurnal.');
            setIsSubmitting(false);
        });
    };

    const handleDateChange = (newDate: string) => {
        router.get(`/guru/jurnal/${student.id}`, { date: newDate }, { preserveState: false });
    };

    return (
        <>
            <Head title={`Jurnal ${student.name}`} />

            <div className="w-full max-w-[760px] mx-auto pb-36 space-y-6">
                {/* Header: Student, NIS, Date Picker, Nav */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)] tracking-tight">
                                    {student.name}
                                </h1>
                                {isFinalized && (
                                    <StatusCapsule status="sudah_diisi" label="Sudah disimpan" />
                                )}
                            </div>
                            <p className="text-sm text-[var(--text-2)] mt-0.5">
                                NIS {student.nis} {classroom && `· ${classroom.name}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[var(--border)] text-sm">
                            <span className="text-[var(--text-2)]">Tanggal:</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    handleDateChange(e.target.value);
                                }}
                                className="border-0 p-0 text-sm font-semibold bg-transparent focus:ring-0 text-[var(--text)] cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-sm font-medium">
                            {prev_student ? (
                                <Link
                                    href={`/guru/jurnal/${prev_student.id}?date=${selectedDate}`}
                                    className="text-[var(--accent)] hover:underline"
                                >
                                    &lt; Sebelumnya
                                </Link>
                            ) : (
                                <span className="text-[var(--text-3)] cursor-not-allowed">
                                    &lt; Sebelumnya
                                </span>
                            )}
                            <span className="text-[var(--border)]">|</span>
                            {next_student ? (
                                <Link
                                    href={`/guru/jurnal/${next_student.id}?date=${selectedDate}`}
                                    className="text-[var(--accent)] hover:underline"
                                >
                                    Berikutnya &gt;
                                </Link>
                            ) : (
                                <span className="text-[var(--text-3)] cursor-not-allowed">
                                    Berikutnya &gt;
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Locked Banner Notification */}
                {isFinalized && (
                    <div className="tile p-5 bg-[#F5F5F7] rounded-2xl border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-sm text-[var(--text)]">
                                {is_locked
                                    ? 'Jurnal sudah disimpan dan terkunci.'
                                    : `Jurnal sudah disimpan, bisa diubah sampai ${locked_until_date ?? 'besok'}.`}
                            </p>
                            <p className="text-xs text-[var(--text-2)] mt-0.5">
                                {is_locked
                                    ? 'Jurnal telah melewati batas jendela waktu perubahan.'
                                    : 'Batas perubahan 24 jam setelah disimpan.'}
                            </p>
                        </div>

                        {can_edit && !isEditingUnlocked && (
                            <button
                                type="button"
                                onClick={() => setIsEditingUnlocked(true)}
                                className="button-secondary text-xs px-4 py-2 shrink-0 self-start sm:self-center"
                            >
                                Ubah jurnal
                            </button>
                        )}
                    </div>
                )}

                {/* Kegiatan Hari Ini Card */}
                <section className="tile p-6 md:p-8 bg-white rounded-[28px] border border-[var(--border)] shadow-xs">
                    <label htmlFor="activity-summary" className="block text-lg font-bold text-[var(--text)] mb-3">
                        Kegiatan hari ini
                    </label>
                    <textarea
                        id="activity-summary"
                        rows={3}
                        disabled={isReadOnly}
                        value={activitySummary}
                        onChange={(e) => setActivitySummary(e.target.value)}
                        placeholder="Mengenal huruf vokal A-I-U-E-O, menyusun balok menara, dan bercerita tentang hewan peliharaan."
                        className="w-full rounded-2xl border border-[var(--border)] p-4 text-[15px] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:bg-[#F5F5F7] disabled:text-[var(--text-2)] resize-none"
                    />
                </section>

                {/* Legend */}
                <div className="text-center text-xs md:text-sm text-[var(--text-2)] py-1">
                    BB belum berkembang · MB mulai berkembang · BSH berkembang sesuai harapan · BSB berkembang sangat baik
                </div>

                {/* 5 Aspect Cards */}
                <div className="space-y-4">
                    {ASPECTS.map((aspect) => {
                        const hasError = !!validationErrors[aspect.key];
                        return (
                            <section
                                key={aspect.key}
                                className={`tile p-6 md:p-8 bg-white rounded-[28px] border shadow-xs transition-all ${
                                    hasError
                                        ? 'border-[#E02020] ring-1 ring-[#E02020]'
                                        : 'border-[var(--border)]'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-[var(--text)]">
                                            {aspect.label}
                                        </h2>
                                        {hasError && (
                                            <p className="text-xs text-[#E02020] font-medium mt-1">
                                                {validationErrors[aspect.key]}
                                            </p>
                                        )}
                                    </div>

                                    <div className="shrink-0">
                                        <SegmentedControl
                                            options={LEVEL_OPTIONS}
                                            value={assessments[aspect.key]?.level}
                                            onChange={(val) => handleLevelChange(aspect.key, val)}
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor={`note-${aspect.key}`} className="block text-xs text-[var(--text-2)] mb-1.5">
                                        Catatan observasi (opsional)
                                    </label>
                                    <textarea
                                        id={`note-${aspect.key}`}
                                        rows={2}
                                        disabled={isReadOnly}
                                        value={assessments[aspect.key]?.note || ''}
                                        onChange={(e) => handleNoteChange(aspect.key, e.target.value)}
                                        placeholder="Catatan perkembangan atau pengamatan guru untuk aspek ini..."
                                        className="w-full rounded-xl border border-[var(--border)] p-3 text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:bg-[#F5F5F7] disabled:text-[var(--text-2)] resize-none"
                                    />
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="fixed-action-bar fixed bottom-[64px] sm:bottom-0 left-0 right-0 z-30 w-full !max-w-none bg-[#FBFBFD]/92 backdrop-blur-[20px] [backdrop-filter:saturate(180%)_blur(20px)] border-t border-[var(--separator)] px-4 md:px-8 py-3.5 shadow-sm">
                <div className="max-w-[760px] w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs md:text-sm">
                        {generalError ? (
                            <span className="text-[#C4271B] font-semibold flex items-center gap-1.5">
                                <AlertCircle size={15} strokeWidth={1.5} className="shrink-0" />
                                {generalError}
                            </span>
                        ) : !isFinalized ? (
                            savedNotice ? (
                                <span className="text-[var(--text-2)] font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1D7A3C] inline-block" />
                                    {savedNotice}
                                </span>
                            ) : (
                                <span className="text-[var(--text-3)]">
                                    Belum ada perubahan tersimpan
                                </span>
                            )
                        ) : isEditingUnlocked && !is_locked ? (
                            <span className="text-[var(--text-2)] font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] inline-block" />
                                Mode edit jurnal · Batas 24 jam
                            </span>
                        ) : (
                            <span className="text-[#1D7A3C] font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1D7A3C] inline-block" />
                                Jurnal sudah disimpan untuk {date_formatted}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                        {!isFinalized ? (
                            <>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleManualSaveDraft}
                                    className="button-secondary text-sm px-5 py-2.5 rounded-full font-medium active:scale-[0.98] transition-all duration-150"
                                >
                                    Simpan draf
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleFinalize}
                                    className="bg-[var(--accent,#0071E3)] text-white text-sm px-6 py-2.5 rounded-full font-semibold hover:bg-[#0077ED] active:scale-[0.98] transition-all duration-150 shadow-xs disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan jurnal'}
                                </button>
                            </>
                        ) : isEditingUnlocked && !is_locked ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingUnlocked(false)}
                                    className="button-secondary text-sm px-5 py-2.5 rounded-full font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleFinalize}
                                    className="bg-[var(--accent,#0071E3)] text-white text-sm px-6 py-2.5 rounded-full font-semibold hover:bg-[#0077ED] transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan perubahan'}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/guru"
                                    className="button-secondary text-sm px-5 py-2.5 rounded-full font-medium"
                                >
                                    Kembali ke Beranda
                                </Link>
                                {can_edit && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingUnlocked(true)}
                                        className="button-secondary text-sm px-5 py-2.5 rounded-full font-medium"
                                    >
                                        Ubah jurnal
                                    </button>
                                )}
                                {next_student && (
                                    <Link
                                        href={`/guru/jurnal/${next_student.id}?date=${selectedDate}`}
                                        className="bg-[var(--accent,#0071E3)] text-white text-sm px-6 py-2.5 rounded-full font-semibold hover:bg-[#0077ED] transition-colors shadow-sm inline-flex items-center gap-1"
                                    >
                                        Siswa Berikutnya &gt;
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

JournalForm.layout = getTeacherLayout;

