import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import ConfirmDialog from '@/Components/ConfirmDialog';
import CustomSelect from '@/Components/CustomSelect';

type Student = { id: number; name: string; nis: string };

type ClassroomTeacher = {
    id: number;
    name: string;
    role: string;
};

type Classroom = {
    id: number;
    name: string;
    age_range: string;
    year: string;
    teacher_id: number | null;
    teacher: string | null;
    teachers?: ClassroomTeacher[];
    students: Student[];
};

type Teacher = { id: number; name: string };

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('');
}

export default function Classrooms({
    classrooms,
    teachers,
}: {
    classrooms: Classroom[];
    teachers: Teacher[];
}) {
    const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
    const [targetClassId, setTargetClassId] = useState<string>('');
    const [confirmMoveOpen, setConfirmMoveOpen] = useState(false);
    const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
    const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
    const [createClassModalOpen, setCreateClassModalOpen] = useState(false);

    const teacherForm = useForm({
        teacher_id: '',
    });

    const createClassForm = useForm({
        name: '',
        age_range: '',
        teacher_id: '',
    });

    const moveForm = useForm({
        student_ids: [] as number[],
    });

    useEffect(() => {
        if (!editingClassroom && !createClassModalOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (editingClassroom && !teacherForm.processing) {
                    setEditingClassroom(null);
                }
                if (createClassModalOpen && !createClassForm.processing) {
                    setCreateClassModalOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [editingClassroom, createClassModalOpen, teacherForm.processing, createClassForm.processing]);

    const toggleStudent = (id: number) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleExpand = (classId: number) => {
        setExpandedClassId(prev => (prev === classId ? null : classId));
    };

    // Determine target classroom for moving
    const findDefaultTarget = () => {
        if (classrooms.length === 2 && selectedStudents.length > 0) {
            // Find which classroom the selected students belong to
            const firstSelectedId = selectedStudents[0];
            const sourceClass = classrooms.find(c => c.students.some(s => s.id === firstSelectedId));
            const otherClass = classrooms.find(c => c.id !== sourceClass?.id);
            return otherClass ? String(otherClass.id) : '';
        }
        return targetClassId || (classrooms[0] ? String(classrooms[0].id) : '');
    };

    const effectiveTargetId = targetClassId || findDefaultTarget();
    const targetClassroom = classrooms.find(c => String(c.id) === String(effectiveTargetId));

    const handleOpenMoveConfirm = () => {
        if (!effectiveTargetId) return;
        moveForm.setData('student_ids', selectedStudents);
        setConfirmMoveOpen(true);
    };

    const handleExecuteMove = () => {
        moveForm.post(`/admin/kelas/${effectiveTargetId}/siswa`, {
            onSuccess: () => {
                setConfirmMoveOpen(false);
                setSelectedStudents([]);
            },
            onError: () => {
                setConfirmMoveOpen(false);
            },
        });
    };

    const handleTeacherSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClassroom) return;
        teacherForm.post(`/admin/kelas/${editingClassroom.id}/wali`, {
            onSuccess: () => {
                setEditingClassroom(null);
                teacherForm.reset();
            },
        });
    };

    const handleCreateClassSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createClassForm.post('/admin/kelas', {
            onSuccess: () => {
                setCreateClassModalOpen(false);
                createClassForm.reset();
            },
        });
    };

    return (
        <>
            <Head title="Kelas & Rombel" />

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">Kelas & Rombel</h1>
                    <p className="text-stone-500 mt-1 text-sm md:text-base">
                        Tahun Ajaran {classrooms[0]?.year ?? 'Belum ada tahun ajaran aktif'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        createClassForm.reset();
                        createClassForm.clearErrors();
                        setCreateClassModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] active:scale-[0.98] transition-all shadow-sm self-start md:self-auto"
                >
                    Tambah kelas
                </button>
            </header>

            {/* Classrooms Grid (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-28">
                {classrooms.map(classroom => {
                    const isExpanded = expandedClassId === classroom.id;
                    const displayedStudents = isExpanded
                        ? classroom.students
                        : classroom.students.slice(0, 6);

                    return (
                        <section
                            key={classroom.id}
                            className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
                                            {classroom.name}
                                        </h2>
                                        <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                                            Usia {classroom.age_range}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 mt-4 text-sm text-stone-600">
                                    <div className="flex items-center gap-2">
                                        <span>Wali kelas: <strong className="font-semibold text-stone-800">{classroom.teacher ?? 'Belum ditugaskan'}</strong></span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingClassroom(classroom);
                                                teacherForm.setData(
                                                    'teacher_id',
                                                    classroom.teacher_id ? String(classroom.teacher_id) : ''
                                                );
                                                teacherForm.clearErrors();
                                            }}
                                            className="text-xs font-semibold text-[#0071E3] hover:underline"
                                        >
                                            Ganti
                                        </button>
                                    </div>
                                    {classroom.teachers && classroom.teachers.filter(t => t.role === 'pendamping').length > 0 && (
                                        <div className="text-xs text-stone-500">
                                            Pendamping: {classroom.teachers.filter(t => t.role === 'pendamping').map(t => t.name).join(', ')}
                                        </div>
                                    )}
                                    <div className="text-xs text-stone-400">
                                        Total tenaga pendidik: {(classroom.teachers?.length || (classroom.teacher ? 1 : 0))}/3 guru
                                    </div>
                                </div>

                                {/* Hero Number (Proportional 48-56px) */}
                                <div className="flex items-baseline gap-3 my-5">
                                    <span className="text-5xl md:text-6xl font-bold text-stone-900 tracking-tight">
                                        {classroom.students.length}
                                    </span>
                                    <span className="text-stone-500 font-medium text-base">siswa</span>
                                </div>

                                {/* Students Checkbox List */}
                                <div className="space-y-2 mt-4">
                                    {classroom.students.length === 0 ? (
                                        <p className="text-sm text-stone-400 py-6 text-center">
                                            Belum ada siswa aktif di kelas ini.
                                        </p>
                                    ) : (
                                        displayedStudents.map(student => {
                                            const isChecked = selectedStudents.includes(student.id);

                                            return (
                                                <label
                                                    key={student.id}
                                                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                                                        isChecked
                                                            ? 'bg-blue-50/50 border-[#0071E3]/40'
                                                            : 'bg-stone-50/70 border-stone-100 hover:bg-stone-100/60'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleStudent(student.id)}
                                                            className="w-4 h-4 rounded text-[#0071E3] focus:ring-[#0071E3] border-stone-300"
                                                        />
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0071E3] flex items-center justify-center font-bold text-xs shrink-0">
                                                            {getInitials(student.name)}
                                                        </div>
                                                        <span className="text-sm font-semibold text-stone-900">
                                                            {student.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-mono text-stone-400">
                                                        {student.nis}
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Card Footer */}
                            {classroom.students.length > 6 && (
                                <div className="flex items-center justify-between pt-6 mt-4 border-t border-stone-100 text-xs text-stone-500">
                                    <span>
                                        Menampilkan {displayedStudents.length} dari {classroom.students.length} siswa
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(classroom.id)}
                                        className="font-semibold text-[#0071E3] hover:underline"
                                    >
                                        {isExpanded ? (
                                            'Tampilkan ringkas'
                                        ) : (
                                            <span className="inline-flex items-center gap-1">
                                                <span>Lihat semua siswa</span>
                                                <ChevronRight size={13} strokeWidth={2} />
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>

            {/* Floating Selection Pill Bar */}
            {selectedStudents.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
                    <div className="bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-stone-200/90 px-6 py-3 flex items-center gap-4 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <span className="text-sm font-bold text-stone-900">
                            {selectedStudents.length} siswa dipilih
                        </span>

                        <span className="h-4 w-px bg-stone-200" />

                        <button
                            type="button"
                            onClick={() => setSelectedStudents([])}
                            className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
                        >
                            Batal pilihan
                        </button>

                        {classrooms.length > 2 && (
                            <CustomSelect
                                value={effectiveTargetId}
                                onChange={val => setTargetClassId(String(val))}
                                buttonClassName="text-xs h-8 px-3 bg-stone-50 border-stone-200"
                                options={classrooms.map(c => ({
                                    value: String(c.id),
                                    label: c.name,
                                }))}
                            />
                        )}

                        <button
                            type="button"
                            onClick={handleOpenMoveConfirm}
                            disabled={moveForm.processing || !targetClassroom}
                            className="px-5 py-2 rounded-full bg-[#0071E3] text-white text-xs font-semibold hover:bg-[#0077ED] transition-colors shadow-sm disabled:opacity-50"
                        >
                            Pindahkan ke {targetClassroom?.name ?? 'Kelas tujuan'}
                        </button>
                    </div>
                </div>
            )}

            {/* Ganti Wali Kelas Modal */}
            {editingClassroom && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="replace-teacher-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !teacherForm.processing) {
                            setEditingClassroom(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl flex flex-col max-h-[calc(100dvh-32px)] border border-stone-100 text-left my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 pb-4 shrink-0 flex items-start justify-between gap-4 border-b border-stone-100">
                            <div>
                                <h2 id="replace-teacher-title" className="text-xl font-bold text-stone-900 tracking-tight">
                                    Ganti wali kelas
                                </h2>
                                <p className="text-xs text-stone-500 mt-1">
                                    Pilih pendidik pengganti untuk {editingClassroom.name} (Usia {editingClassroom.age_range}).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!teacherForm.processing) setEditingClassroom(null);
                                }}
                                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <form onSubmit={handleTeacherSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
                                <div>
                                    <label htmlFor="w_teacher_id" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Wali kelas baru
                                    </label>
                                    <CustomSelect
                                        className="w-full"
                                        buttonClassName="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 h-auto"
                                        value={teacherForm.data.teacher_id}
                                        onChange={val => teacherForm.setData('teacher_id', String(val))}
                                        placeholder="Pilih guru"
                                        options={[
                                            { value: '', label: 'Pilih guru' },
                                            ...teachers.map(t => ({
                                                value: String(t.id),
                                                label: t.name,
                                            })),
                                        ]}
                                    />
                                    {teacherForm.errors.teacher_id && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">
                                            {teacherForm.errors.teacher_id}
                                        </p>
                                    )}
                                </div>

                                <p className="text-xs text-stone-500">
                                    Wali kelas saat ini: {editingClassroom.teacher ?? 'Belum ditugaskan'}
                                </p>

                                {/* Amber Notice */}
                                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 text-xs font-medium leading-relaxed">
                                    Guru lama tidak lagi bisa mengisi jurnal kelas ini.
                                </div>
                            </div>

                            {/* Sticky footer buttons */}
                            <div className="p-4 px-6 border-t border-stone-100 bg-stone-50/60 shrink-0 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingClassroom(null)}
                                    className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-white transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={teacherForm.processing}
                                    className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {teacherForm.processing ? 'Menyimpan…' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Tambah Kelas Modal */}
            {createClassModalOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-class-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !createClassForm.processing) {
                            setCreateClassModalOpen(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl flex flex-col max-h-[calc(100dvh-32px)] border border-stone-100 text-left my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 pb-4 shrink-0 flex items-start justify-between gap-4 border-b border-stone-100">
                            <div>
                                <h2 id="create-class-title" className="text-xl font-bold text-stone-900 tracking-tight">
                                    Tambah kelas baru
                                </h2>
                                <p className="text-xs text-stone-500 mt-1">
                                    Buat rombongan belajar baru untuk tahun ajaran aktif.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!createClassForm.processing) setCreateClassModalOpen(false);
                                }}
                                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <form onSubmit={handleCreateClassSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Nama kelas
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createClassForm.data.name}
                                        onChange={e => createClassForm.setData('name', e.target.value)}
                                        placeholder="Contoh: Kelompok Bermain atau Kelompok C"
                                        className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                    />
                                    {createClassForm.errors.name && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">
                                            {createClassForm.errors.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Rentang usia
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createClassForm.data.age_range}
                                        onChange={e => createClassForm.setData('age_range', e.target.value)}
                                        placeholder="Contoh: 3–4 tahun atau 4–5 tahun"
                                        className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                    />
                                    {createClassForm.errors.age_range && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">
                                            {createClassForm.errors.age_range}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Wali kelas (opsional)
                                    </label>
                                    <CustomSelect
                                        className="w-full"
                                        buttonClassName="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 h-auto"
                                        value={createClassForm.data.teacher_id}
                                        onChange={val => createClassForm.setData('teacher_id', String(val))}
                                        placeholder="Pilih wali kelas"
                                        options={[
                                            { value: '', label: 'Belum ditugaskan' },
                                            ...teachers.map(t => ({
                                                value: String(t.id),
                                                label: t.name,
                                            })),
                                        ]}
                                    />
                                    {createClassForm.errors.teacher_id && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">
                                            {createClassForm.errors.teacher_id}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Sticky footer buttons */}
                            <div className="p-4 px-6 border-t border-stone-100 bg-stone-50/60 shrink-0 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCreateClassModalOpen(false)}
                                    className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-white active:scale-[0.98] transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={createClassForm.processing}
                                    className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                                >
                                    {createClassForm.processing ? 'Menyimpan…' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Move Students Confirmation Dialog */}
            <ConfirmDialog
                open={confirmMoveOpen}
                title="Pindahkan siswa?"
                description={
                    <span>
                        <strong>{selectedStudents.length} siswa</strong> akan dipindahkan ke{' '}
                        <strong>{targetClassroom?.name ?? 'kelas tujuan'}</strong>.
                    </span>
                }
                confirmLabel="Pindahkan"
                busy={moveForm.processing}
                onCancel={() => setConfirmMoveOpen(false)}
                onConfirm={handleExecuteMove}
            />
        </>
    );
}

Classrooms.layout = getAdminLayout;

