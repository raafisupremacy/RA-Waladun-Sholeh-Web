import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Head, router, usePage } from '@inertiajs/react';
import { NotebookPen, X } from 'lucide-react';
import { getTeacherLayout } from '@/Layouts/TeacherLayout';
import StatusCapsule from '@/Components/StatusCapsule';

type StudentItem = {
    id: number;
    name: string;
    nis: string;
    initials: string;
    notes_count: number;
};

type NoteItem = {
    id: number;
    student_id: number;
    noted_at: string;
    noted_at_formatted: string;
    date_only: string;
    time_only: string;
    observed_behavior: string;
    interpretation: string;
    follow_up: string | null;
    has_photo: boolean;
    photo_url: string | null;
};

type Props = {
    classroom: {
        id: number;
        name: string;
    } | null;
    students: StudentItem[];
    selected_student: {
        id: number;
        name: string;
        nis: string;
        age: string;
        homeroom_teacher: string;
    } | null;
    notes: {
        data: NoteItem[];
    };
};

export default function AnecdotalNotes({
    classroom,
    students = [],
    selected_student,
    notes,
}: Props) {
    const pageProps = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    const [search, setSearch] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

    // Form states
    const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [formTime, setFormTime] = useState(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });
    const [observedBehavior, setObservedBehavior] = useState('');
    const [interpretation, setInterpretation] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isDrawerOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) {
                setIsDrawerOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDrawerOpen, isSubmitting]);

    const filteredStudents = useMemo(() => {
        if (!search.trim()) return students;
        const q = search.toLowerCase();
        return students.filter((s) => s.name.toLowerCase().includes(q) || s.nis.includes(q));
    }, [students, search]);

    const handleSelectStudent = (studentId: number) => {
        router.get('/guru/anekdot', { student_id: studentId }, { preserveState: true, preserveScroll: true });
    };

    const handleOpenAddDrawer = () => {
        setEditingNote(null);
        setFormDate(new Date().toISOString().split('T')[0]);
        const now = new Date();
        setFormTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        setObservedBehavior('');
        setInterpretation('');
        setFollowUp('');
        setSelectedPhoto(null);
        setFormErrors({});
        setIsDrawerOpen(true);
    };

    const handleOpenEditDrawer = (note: NoteItem) => {
        setEditingNote(note);
        setFormDate(note.date_only || new Date().toISOString().split('T')[0]);
        setFormTime(note.time_only || '08:00');
        setObservedBehavior(note.observed_behavior);
        setInterpretation(note.interpretation);
        setFollowUp(note.follow_up || '');
        setSelectedPhoto(null);
        setFormErrors({});
        setIsDrawerOpen(true);
    };

    const handleSubmitForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected_student) return;

        const errors: Record<string, string> = {};
        if (!observedBehavior.trim()) errors.observed_behavior = 'Perilaku yang teramati wajib diisi';
        if (!interpretation.trim()) errors.interpretation = 'Interpretasi guru wajib diisi';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setIsSubmitting(true);
        const combinedDatetime = `${formDate} ${formTime}:00`;

        const formData = new FormData();
        formData.append('student_id', String(selected_student.id));
        formData.append('noted_at', combinedDatetime);
        formData.append('observed_behavior', observedBehavior);
        formData.append('interpretation', interpretation);
        if (followUp) formData.append('follow_up', followUp);
        if (selectedPhoto) formData.append('photo', selectedPhoto);

        if (editingNote) {
            formData.append('_method', 'PUT');
            router.post(`/guru/anekdot/${editingNote.id}`, formData, {
                onSuccess: () => {
                    setIsDrawerOpen(false);
                    setIsSubmitting(false);
                },
                onError: (errs) => {
                    setFormErrors(errs as Record<string, string>);
                    setIsSubmitting(false);
                },
            });
        } else {
            router.post('/guru/anekdot', formData, {
                onSuccess: () => {
                    setIsDrawerOpen(false);
                    setIsSubmitting(false);
                },
                onError: (errs) => {
                    setFormErrors(errs as Record<string, string>);
                    setIsSubmitting(false);
                },
            });
        }
    };

    return (
        <>
            <Head title="Catatan Anekdot" />

            <div className="page-content space-y-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Sidebar: Student List */}
                    <div className="w-full lg:w-80 shrink-0 space-y-4">
                        <div className="tile p-5 bg-white rounded-[24px] border border-[var(--border)] shadow-xs">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-bold text-base text-[var(--text)]">Daftar Siswa</h2>
                                <span className="text-xs text-[var(--text-2)] font-medium">
                                    {classroom?.name ?? 'Kelas'}
                                </span>
                            </div>

                            {/* Search Box */}
                            <div className="relative mb-3">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari siswa..."
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[#F5F5F7] focus:bg-white focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                                />
                                <svg
                                    className="w-4 h-4 text-[var(--text-2)] absolute left-3 top-2.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>

                            {/* Students List */}
                            <div className="space-y-1 max-h-[550px] overflow-y-auto pr-1">
                                {filteredStudents.map((s) => {
                                    const isSelected = selected_student?.id === s.id;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => handleSelectStudent(s.id)}
                                            className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                                                isSelected
                                                    ? 'bg-[#EBF4FE] text-[var(--accent)]'
                                                    : 'hover:bg-[#F5F5F7] text-[var(--text)]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                    className={`w-9 h-9 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 ${
                                                        isSelected
                                                            ? 'bg-[var(--accent)] text-white'
                                                            : 'bg-[#F0F0F2] text-[var(--text)]'
                                                    }`}
                                                >
                                                    {s.initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm truncate">{s.name}</p>
                                                    <p className="text-xs text-[var(--text-2)]">NIS {s.nis}</p>
                                                </div>
                                            </div>

                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-[var(--border)] text-[var(--text-2)] font-medium shrink-0 ml-2">
                                                {s.notes_count} catatan
                                            </span>
                                        </button>
                                    );
                                })}

                                {filteredStudents.length === 0 && (
                                    <p className="text-xs text-[var(--text-2)] text-center py-4">
                                        Siswa tidak ditemukan
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Main Column: Selected Student Timeline */}
                    <div className="flex-1 min-w-0 space-y-6">
                        {selected_student ? (
                            <>
                                {/* Student Header & Action */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)] tracking-tight">
                                            {selected_student.name}
                                        </h1>
                                        <p className="text-sm text-[var(--text-2)] mt-0.5">
                                            NIS {selected_student.nis} {classroom && `· ${classroom.name}`}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleOpenAddDrawer}
                                        className="bg-[var(--accent,#0071E3)] text-white text-sm px-5 py-2.5 rounded-full font-semibold hover:bg-[#0077ED] transition-colors shadow-sm inline-flex items-center gap-1.5 self-start sm:self-auto"
                                    >
                                        + Tambah Catatan
                                    </button>
                                </div>

                                {/* Summary Stat Tiles */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="tile p-4 bg-white rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs text-[var(--text-2)]">Wali Kelas</p>
                                        <p className="text-sm font-semibold text-[var(--text)] mt-0.5 truncate">
                                            {selected_student.homeroom_teacher}
                                        </p>
                                    </div>
                                    <div className="tile p-4 bg-white rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs text-[var(--text-2)]">Usia Peserta</p>
                                        <p className="text-sm font-semibold text-[var(--text)] mt-0.5">
                                            {selected_student.age}
                                        </p>
                                    </div>
                                    <div className="tile p-4 bg-white rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs text-[var(--text-2)]">Total Observasi</p>
                                        <p className="text-sm font-semibold text-[var(--text)] mt-0.5">
                                            {notes.data.length} Catatan
                                        </p>
                                    </div>
                                </div>

                                {/* Notes Timeline */}
                                {notes.data.length === 0 ? (
                                    <div className="tile p-12 bg-white rounded-[28px] border border-[var(--border)] text-center space-y-4 shadow-xs">
                                        <div className="w-14 h-14 rounded-full bg-[#F5F5F7] text-stone-400 mx-auto flex items-center justify-center">
                                            <NotebookPen size={24} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-[var(--text)]">
                                                Belum ada catatan untuk {selected_student.name}.
                                            </p>
                                            <p className="text-xs text-[var(--text-2)] mt-1 max-w-md mx-auto">
                                                Catatan anekdot digunakan untuk mendokumentasikan perilaku unik, celoteh bermakna, serta kemajuan capaian belajar anak yang terjadi secara spontan sepanjang kegiatan sentra dan bermain bebas.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleOpenAddDrawer}
                                            className="text-[var(--accent)] font-semibold text-sm hover:underline"
                                        >
                                            Tambah catatan &gt;
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {notes.data.map((note) => (
                                            <article
                                                key={note.id}
                                                className="tile p-6 md:p-8 bg-white rounded-[24px] border border-[var(--border)] shadow-xs space-y-4"
                                            >
                                                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                                                    <span className="text-xs md:text-sm font-medium text-[var(--text-2)]">
                                                        {note.noted_at_formatted} · Semester Ganjil
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditDrawer(note)}
                                                        className="text-xs text-[var(--accent)] font-semibold hover:underline"
                                                    >
                                                        Ubah
                                                    </button>
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
                                                                alt="Lampiran observasi"
                                                                className="max-h-48 object-cover rounded-xl"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        ))}

                                        <p className="text-xs text-[var(--text-2)] text-center pt-2">
                                            Catatan anekdot digunakan untuk mendokumentasikan perilaku unik, celoteh bermakna, serta kemajuan capaian belajar anak secara spontan.
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="tile p-12 bg-white rounded-[28px] border border-[var(--border)] text-center text-[var(--text-2)]">
                                Pilih siswa dari daftar untuk melihat catatan anekdot.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Catatan Anekdot */}
            {isDrawerOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="anecdote-modal-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isSubmitting) {
                            setIsDrawerOpen(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl flex flex-col max-h-[calc(100dvh-32px)] border border-stone-100 text-left my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 pb-4 shrink-0 flex items-start justify-between gap-4 border-b border-stone-100">
                            <div>
                                <h2 id="anecdote-modal-title" className="text-xl font-bold text-stone-900 tracking-tight">
                                    {editingNote ? 'Ubah Catatan Anekdot' : 'Tambah Catatan Anekdot'}
                                </h2>
                                <p className="text-xs text-stone-500 mt-1">
                                    Dokumentasikan peristiwa penting atau perkembangan perilaku anak.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isSubmitting) setIsDrawerOpen(false);
                                }}
                                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                                aria-label="Tutup"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                        Siswa
                                    </label>
                                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 text-sm font-semibold text-stone-800">
                                        {selected_student?.name} — NIS {selected_student?.nis}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="note-date" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                            Tanggal
                                        </label>
                                        <input
                                            id="note-date"
                                            type="date"
                                            value={formDate}
                                            onChange={(e) => setFormDate(e.target.value)}
                                            className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="note-time" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                            Waktu
                                        </label>
                                        <input
                                            id="note-time"
                                            type="time"
                                            value={formTime}
                                            onChange={(e) => setFormTime(e.target.value)}
                                            className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="observed-behavior" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                        Perilaku yang teramati *
                                    </label>
                                    <textarea
                                        id="observed-behavior"
                                        rows={3}
                                        value={observedBehavior}
                                        onChange={(e) => setObservedBehavior(e.target.value)}
                                        placeholder="Deskripsikan apa yang dilakukan atau dikatakan anak secara faktual..."
                                        className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900 resize-none"
                                        required
                                    />
                                    {formErrors.observed_behavior && (
                                        <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.observed_behavior}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="interpretation" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                        Interpretasi guru *
                                    </label>
                                    <textarea
                                        id="interpretation"
                                        rows={2}
                                        value={interpretation}
                                        onChange={(e) => setInterpretation(e.target.value)}
                                        placeholder="Makna atau capaian perkembangan yang terindikasi dari perilaku..."
                                        className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900 resize-none"
                                        required
                                    />
                                    {formErrors.interpretation && (
                                        <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.interpretation}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="follow-up" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                        Tindak lanjut (opsional)
                                    </label>
                                    <textarea
                                        id="follow-up"
                                        rows={2}
                                        value={followUp}
                                        onChange={(e) => setFollowUp(e.target.value)}
                                        placeholder="Rencana stimulasi atau dukungan pembelajaran selanjutnya..."
                                        className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900 resize-none"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="photo-file" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                        Lampiran foto (opsional, maks 5MB)
                                    </label>
                                    <input
                                        id="photo-file"
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={(e) => setSelectedPhoto(e.target.files?.[0] ?? null)}
                                        className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#EBF4FE] file:text-[#0071E3] hover:file:bg-[#DCEAFE]"
                                    />
                                    {formErrors.photo && (
                                        <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.photo}</p>
                                    )}
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="p-4 px-6 border-t border-stone-100 bg-stone-50/60 shrink-0 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsDrawerOpen(false)}
                                    className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-white transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

AnecdotalNotes.layout = getTeacherLayout;

