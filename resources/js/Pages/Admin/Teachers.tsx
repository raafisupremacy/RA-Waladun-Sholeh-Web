import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import ConfirmDialog from '@/Components/ConfirmDialog';
import CustomSelect from '@/Components/CustomSelect';

type Teacher = {
    id: number;
    name: string;
    nip: string;
    email: string;
    phone: string;
    is_active: boolean;
    classroom: string | null;
    classroom_id?: number | null;
    classroom_role?: string;
    account_status?: string;
};

type ClassroomItem = {
    id: number;
    name: string;
    teachers_count?: number;
    max_teachers?: number;
    is_full?: boolean;
};

type PageData<T> = {
    data: T[];
    total: number;
    from?: number;
    to?: number;
    current_page: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
};

export default function Teachers({
    teachers,
    classrooms,
    filters,
    academicYear,
}: {
    teachers: PageData<Teacher>;
    classrooms: ClassroomItem[];
    filters: { search?: string };
    academicYear?: string | null;
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [resetBusy, setResetBusy] = useState(false);

    // Class assignment modal state
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignTeacher, setAssignTeacher] = useState<Teacher | null>(null);

    const assignForm = useForm({
        classroom_id: '',
        role: 'pendamping',
    });

    const form = useForm({
        name: '',
        nip: '',
        email: '',
        phone: '',
        classroom_id: '',
    });

    const handleOpenAssignClass = (teacher: Teacher) => {
        setAssignTeacher(teacher);
        assignForm.setData({
            classroom_id: teacher.classroom_id ? String(teacher.classroom_id) : '',
            role: teacher.classroom_role || 'pendamping',
        });
        assignForm.clearErrors();
        setAssignModalOpen(true);
    };

    const handleAssignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignTeacher) return;
        assignForm.post(`/admin/guru/${assignTeacher.id}/kelas`, {
            onSuccess: () => {
                setAssignModalOpen(false);
                setAssignTeacher(null);
            },
        });
    };

    useEffect(() => {
        if (!assignModalOpen && !drawerOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (assignModalOpen && !assignForm.processing) {
                    setAssignModalOpen(false);
                    setAssignTeacher(null);
                }
                if (drawerOpen && !form.processing) {
                    setDrawerOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [assignModalOpen, drawerOpen, assignForm.processing, form.processing]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/guru', { search: search.trim() }, { preserveState: true, replace: true });
    };

    const handleClearSearch = () => {
        setSearch('');
        router.get('/admin/guru', {}, { preserveState: true, replace: true });
    };

    const handleTeacherSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/guru', {
            onSuccess: () => {
                setDrawerOpen(false);
                form.reset();
            },
        });
    };

    return (
        <>
            <Head title="Data Guru" />

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">Data Guru</h1>
                    <p className="text-stone-500 mt-1 text-sm md:text-base">{teachers.total} tenaga pendidik</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        form.reset();
                        form.clearErrors();
                        setDrawerOpen(true);
                    }}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-sm self-start md:self-auto"
                >
                    Tambah guru
                </button>
            </header>

            <section className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden p-6 md:p-8">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                        <label htmlFor="search" className="sr-only">Cari nama, NIP, atau wali kelas</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                id="search"
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari nama, NIP, atau wali kelas"
                                className="w-full pl-10 pr-20 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900 placeholder:text-stone-400"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute right-14 top-1/2 -translate-y-1/2 !min-h-0 h-5 w-5 flex items-center justify-center text-xs text-stone-400 hover:text-stone-600"
                                >
                                    <X size={13} strokeWidth={2} />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 !min-h-0 h-7 px-3 rounded-full bg-stone-200 hover:bg-stone-300 text-xs font-medium text-stone-700 transition-colors flex items-center justify-center active:scale-[0.98]"
                            >
                                Cari
                            </button>
                        </div>
                    </form>
                </div>

                {/* Content */}
                {teachers.data.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        {filters.search ? (
                            <>
                                <p className="text-base font-semibold text-stone-900">
                                    Tidak ada guru dengan kata kunci ‘{filters.search}’.
                                </p>
                                <p className="text-sm text-stone-500 mt-1">Coba periksa kembali ejaan.</p>
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="mt-4 inline-flex items-center text-sm font-semibold text-[#0071E3] hover:underline"
                                >
                                    Hapus pencarian
                                </button>
                            </>
                        ) : (
                            <p className="text-stone-500 text-sm">Belum ada tenaga pendidik terdaftar.</p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Table View with non-wrapping columns */}
                        <div className="overflow-x-auto mt-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-100 text-xs font-semibold uppercase tracking-wider text-stone-400 whitespace-nowrap">
                                        <th className="py-4 px-4">Nama</th>
                                        <th className="py-4 px-4">NIP</th>
                                        <th className="py-4 px-4">Email</th>
                                        <th className="py-4 px-4">No. HP</th>
                                        <th className="py-4 px-4">Kelas</th>
                                        <th className="py-4 px-4">Status akun</th>
                                        <th className="py-4 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                                    {teachers.data.map(teacher => {
                                        const status = teacher.account_status ?? (teacher.is_active ? 'aktif' : 'nonaktif');

                                        return (
                                            <tr key={teacher.id} className="hover:bg-stone-50/70 transition-colors whitespace-nowrap">
                                                <td className="py-4 px-4 font-semibold text-stone-900">{teacher.name}</td>
                                                <td className="py-4 px-4 text-stone-500 font-mono text-xs">{teacher.nip}</td>
                                                <td className="py-4 px-4 text-stone-600 text-xs">{teacher.email}</td>
                                                <td className="py-4 px-4 text-stone-600">{teacher.phone || '—'}</td>
                                                <td className="py-4 px-4 text-stone-800">
                                                    {teacher.classroom ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-stone-900">{teacher.classroom}</span>
                                                            <span className="text-[11px] text-stone-500 font-medium">
                                                                {teacher.classroom_role === 'wali_kelas' ? 'Wali kelas' : 'Guru pendamping'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-stone-400 italic text-xs">Belum ada kelas</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4">
                                                    {status === 'belum_masuk' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                            Belum pernah masuk
                                                        </span>
                                                    ) : (
                                                        <StatusCapsule status={status} />
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenAssignClass(teacher)}
                                                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-[#0071E3] hover:bg-blue-100 transition-colors shadow-2xs"
                                                        >
                                                            {teacher.classroom ? 'Ubah kelas' : 'Tugaskan kelas'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedTeacher(teacher)}
                                                            className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
                                                        >
                                                            Reset kata sandi
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-stone-100 text-sm text-stone-500">
                            <p>
                                Menampilkan {teachers.from ?? 0}–{teachers.to ?? 0} dari {teachers.total} tenaga pendidik
                            </p>
                            <nav className="inline-flex items-center gap-1.5" aria-label="Navigasi halaman">
                                {teachers.links.map((link, idx) => {
                                    const isPrev = link.label.toLowerCase().includes('previous') || link.label.includes('Sebelumnya') || link.label.includes('&laquo;');
                                    const isNext = link.label.toLowerCase().includes('next') || link.label.includes('Selanjutnya') || link.label.includes('&raquo;');
                                    const cleanLabel = isPrev ? 'Sebelumnya' : isNext ? 'Selanjutnya' : link.label;

                                    if (!link.url) {
                                        return (
                                            <span
                                                key={idx}
                                                className="px-3 py-1.5 rounded-full text-xs text-stone-300 font-medium select-none"
                                            >
                                                {cleanLabel}
                                            </span>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            preserveState
                                            replace
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-[#0071E3] text-white shadow-sm'
                                                    : 'text-stone-700 hover:bg-stone-100'
                                            }`}
                                        >
                                            {cleanLabel}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    </>
                )}
            </section>

            {/* Tambah Guru Drawer (06D) */}
            {drawerOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
                        onClick={() => {
                            if (!form.processing) setDrawerOpen(false);
                        }}
                    />
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-100 animate-in slide-in-from-right duration-200">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 shrink-0">
                                <h2 id="drawer-title" className="text-xl font-bold text-stone-900 tracking-tight">
                                    Tambah guru
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
                                    className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleTeacherSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5">
                                    <div>
                                        <label htmlFor="t_name" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                            Nama lengkap
                                        </label>
                                        <input
                                            id="t_name"
                                            type="text"
                                            required
                                            value={form.data.name}
                                            onChange={e => form.setData('name', e.target.value)}
                                            placeholder="Contoh: Siti Rahmawati, S.Pd."
                                            className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                        />
                                        {form.errors.name && (
                                            <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="t_nip" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                            NIP
                                        </label>
                                        <input
                                            id="t_nip"
                                            type="text"
                                            required
                                            value={form.data.nip}
                                            onChange={e => form.setData('nip', e.target.value)}
                                            placeholder="18 digit NIP"
                                            className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                        />
                                        {form.errors.nip && (
                                            <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.nip}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="t_email" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                            Email
                                        </label>
                                        <input
                                            id="t_email"
                                            type="email"
                                            required
                                            value={form.data.email}
                                            onChange={e => form.setData('email', e.target.value)}
                                            placeholder="nama@waladun-sholeh.sch.id"
                                            className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                        />
                                        {form.errors.email && (
                                            <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.email}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="t_phone" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                            No. HP
                                        </label>
                                        <input
                                            id="t_phone"
                                            type="tel"
                                            required
                                            value={form.data.phone}
                                            onChange={e => form.setData('phone', e.target.value)}
                                            placeholder="0812-xxxx-xxxx"
                                            className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                        />
                                        {form.errors.phone && (
                                            <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.phone}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                            Penugasan kelas (opsional)
                                        </label>
                                        <CustomSelect
                                            className="w-full"
                                            buttonClassName="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 h-auto"
                                            value={form.data.classroom_id || ''}
                                            onChange={val => form.setData('classroom_id', String(val))}
                                            options={[
                                                { value: '', label: 'Tanpa kelas (Belum ditugaskan)' },
                                                ...classrooms.map(c => {
                                                    const count = c.teachers_count ?? 0;
                                                    const isFull = count >= 3;
                                                    return {
                                                        value: String(c.id),
                                                        label: isFull ? `${c.name} (3/3 guru — Penuh)` : `${c.name} (${count}/3 guru)`,
                                                        disabled: isFull,
                                                    };
                                                }),
                                            ]}
                                        />
                                        {form.data.classroom_id ? (
                                            <p className="mt-2 text-xs text-blue-800 bg-blue-50 p-2.5 rounded-xl border border-blue-200/70">
                                                Guru akan ditugaskan ke kelas terpilih. 1 kelas maksimal 3 guru (1 wali kelas utama dan 2 pendamping).
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-xs text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                                                Dapat ditugaskan ke kelas kapan saja melalui tombol "Tugaskan kelas" pada tabel.
                                            </p>
                                        )}
                                        {(form.errors.classroom_id || (form.errors as Record<string, string>).teacher_id) && (
                                            <p className="mt-1.5 text-xs text-red-600 font-medium">
                                                {form.errors.classroom_id || (form.errors as Record<string, string>).teacher_id}
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-xs text-stone-500 pt-2 leading-relaxed">
                                        • Akun guru dibuat otomatis. Kata sandi sementara dikirim ke email di atas dan ditampilkan sekali.
                                    </div>

                                    {Object.keys(form.errors).length > 0 && (
                                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
                                            Terdapat kesalahan pada formulir. Mohon periksa kembali data di atas.
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 px-6 border-t border-stone-100 bg-stone-50/60 shrink-0 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDrawerOpen(false)}
                                        className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-white transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {form.processing ? 'Menyimpan…' : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Atur Penugasan Kelas */}
            {assignModalOpen && assignTeacher && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="assign-class-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !assignForm.processing) {
                            setAssignModalOpen(false);
                            setAssignTeacher(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl flex flex-col max-h-[calc(100dvh-32px)] border border-stone-100 text-left my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 pb-4 shrink-0 flex items-start justify-between gap-4 border-b border-stone-100">
                            <div>
                                <h2 id="assign-class-title" className="text-xl font-bold text-stone-900 tracking-tight">
                                    Atur Penugasan Kelas
                                </h2>
                                <p className="text-xs text-stone-500 mt-1">
                                    Kelola penugasan guru ke rombel pada tahun ajaran {academicYear || 'aktif'}.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!assignForm.processing) {
                                        setAssignModalOpen(false);
                                        setAssignTeacher(null);
                                    }
                                }}
                                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <form onSubmit={handleAssignSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
                                {/* Profil Guru */}
                                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-stone-900 text-sm">{assignTeacher.name}</span>
                                        <span className="text-xs font-mono text-stone-500">{assignTeacher.nip}</span>
                                    </div>
                                    <div className="text-xs text-stone-500 pt-1 border-t border-stone-200/60 flex items-center justify-between">
                                        <span>Status saat ini:</span>
                                        <span className="font-medium text-stone-800">
                                            {assignTeacher.classroom
                                                ? `${assignTeacher.classroom} (${assignTeacher.classroom_role === 'wali_kelas' ? 'Wali kelas' : 'Pendamping'})`
                                                : 'Belum ada kelas'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Pilih kelas
                                    </label>
                                    <CustomSelect
                                        className="w-full"
                                        buttonClassName="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 h-auto"
                                        value={assignForm.data.classroom_id}
                                        onChange={val => assignForm.setData('classroom_id', String(val))}
                                        options={[
                                            { value: '', label: 'Tanpa kelas (Lepas penugasan)' },
                                            ...classrooms.map(c => {
                                                const isCurrentClass = assignTeacher && assignTeacher.classroom_id === c.id;
                                                const count = c.teachers_count ?? 0;
                                                const isFull = !isCurrentClass && count >= 3;

                                                let label = `${c.name} (${count}/3 guru)`;
                                                if (isCurrentClass) {
                                                    label = `${c.name} (${count}/3 guru — Kelas saat ini)`;
                                                } else if (isFull) {
                                                    label = `${c.name} (3/3 guru — Penuh)`;
                                                }

                                                return {
                                                    value: String(c.id),
                                                    label,
                                                    disabled: isFull,
                                                };
                                            }),
                                        ]}
                                    />
                                    {assignForm.errors.classroom_id && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">
                                            {assignForm.errors.classroom_id}
                                        </p>
                                    )}
                                </div>

                                {assignForm.data.classroom_id && (
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                            Peran di kelas
                                        </label>
                                        <CustomSelect
                                            className="w-full"
                                            buttonClassName="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 h-auto"
                                            value={assignForm.data.role}
                                            onChange={val => assignForm.setData('role', String(val))}
                                            options={[
                                                { value: 'pendamping', label: 'Guru pendamping (Co-teacher)' },
                                                { value: 'wali_kelas', label: 'Wali kelas utama' },
                                            ]}
                                        />
                                        {assignForm.data.role === 'wali_kelas' && (
                                            <p className="mt-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/70">
                                                Jika kelas sudah memiliki wali kelas, guru lama akan otomatis disesuaikan menjadi guru pendamping.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Info Box: 1 kelas maksimal 3 guru */}
                                <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-3.5 text-xs text-blue-900 leading-relaxed">
                                    <span className="font-bold text-blue-700">Aturan: </span>
                                    1 kelas maksimal <strong>3 guru</strong> (1 wali kelas utama dan 2 pendamping). Semua guru di kelas dapat mengisi jurnal harian dan perkembangan siswa.
                                </div>
                            </div>

                            {/* Sticky footer buttons */}
                            <div className="p-4 px-6 border-t border-stone-100 bg-stone-50/60 shrink-0 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAssignModalOpen(false);
                                        setAssignTeacher(null);
                                    }}
                                    className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-white transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={assignForm.processing}
                                    className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {assignForm.processing ? 'Menyimpan…' : 'Simpan penugasan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Reset Password Confirmation Dialog */}
            <ConfirmDialog
                open={!!selectedTeacher}
                title={`Reset kata sandi ${selectedTeacher?.name}?`}
                description={
                    <span>
                        Buat kata sandi sementara baru untuk <strong>{selectedTeacher?.email}</strong>. Guru wajib
                        menggantinya setelah masuk.
                    </span>
                }
                confirmLabel="Reset"
                busy={resetBusy}
                onCancel={() => setSelectedTeacher(null)}
                onConfirm={() => {
                    if (selectedTeacher) {
                        router.post(
                            `/admin/guru/${selectedTeacher.id}/reset-kata-sandi`,
                            {},
                            {
                                onStart: () => setResetBusy(true),
                                onFinish: () => setResetBusy(false),
                                onSuccess: () => setSelectedTeacher(null),
                            }
                        );
                    }
                }}
            />
        </>
    );
}

Teachers.layout = getAdminLayout;

