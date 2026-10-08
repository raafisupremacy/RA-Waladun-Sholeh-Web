import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import ConfirmDialog from '@/Components/ConfirmDialog';

type Student = { id: number; name: string; nis: string };

type Classroom = {
    id: number;
    name: string;
    age_range: string;
    year: string;
    teacher_id: number | null;
    teacher: string | null;
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
    const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>({});

    const teacherForm = useForm({
        teacher_id: '',
    });

    const moveForm = useForm({
        student_ids: [] as number[],
    });

    const toggleStudent = (id: number) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleExpand = (classId: number) => {
        setExpandedClasses(prev => ({
            ...prev,
            [classId]: !prev[classId],
        }));
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

    return (
        <AdminLayout>
            <Head title="Kelas & Rombel" />

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">Kelas & Rombel</h1>
                    <p className="text-stone-500 mt-1 text-sm md:text-base">
                        Tahun Ajaran {classrooms[0]?.year ?? 'Belum ada tahun ajaran aktif'}
                    </p>
                </div>
            </header>

            {/* Classrooms Grid (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-28">
                {classrooms.map(classroom => {
                    const isExpanded = !!expandedClasses[classroom.id];
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

                                <div className="flex items-center gap-2 mt-4 text-sm text-stone-600">
                                    <span>Wali kelas: {classroom.teacher ?? 'Belum ditugaskan'}</span>
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
                                        className="text-sm font-semibold text-[#0071E3] hover:underline"
                                    >
                                        Ganti
                                    </button>
                                </div>

                                {/* Hero Number 72px */}
                                <div className="flex items-baseline gap-3 my-6">
                                    <span className="text-6xl md:text-7xl font-extrabold text-stone-900 tracking-tight">
                                        {classroom.students.length}
                                    </span>
                                    <span className="text-stone-500 font-medium text-lg">siswa</span>
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
                                        {isExpanded ? 'Tampilkan ringkas' : 'Lihat semua siswa ›'}
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
                    <div className="bg-white rounded-full shadow-2xl border border-stone-200/90 px-6 py-3.5 flex items-center gap-4 whitespace-nowrap">
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
                            <select
                                value={effectiveTargetId}
                                onChange={e => setTargetClassId(e.target.value)}
                                className="text-xs py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-full text-stone-800 focus:outline-none"
                            >
                                {classrooms.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
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
            {editingClassroom && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="replace-teacher-title"
                >
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-left border border-stone-100">
                        <div>
                            <h2 id="replace-teacher-title" className="text-2xl font-bold text-stone-900 tracking-tight">
                                Ganti wali kelas
                            </h2>
                            <p className="text-sm text-stone-500 mt-1">
                                Pilih pendidik pengganti untuk {editingClassroom.name} (Usia {editingClassroom.age_range}).
                            </p>
                        </div>

                        <form onSubmit={handleTeacherSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="w_teacher_id" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    Wali kelas baru
                                </label>
                                <select
                                    id="w_teacher_id"
                                    required
                                    value={teacherForm.data.teacher_id}
                                    onChange={e => teacherForm.setData('teacher_id', e.target.value)}
                                    className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                >
                                    <option value="">Pilih guru</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
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
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs font-medium leading-relaxed">
                                Guru lama tidak lagi bisa mengisi jurnal kelas ini.
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingClassroom(null)}
                                    className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
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
                </div>
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
        </AdminLayout>
    );
}
