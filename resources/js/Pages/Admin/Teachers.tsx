import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import ConfirmDialog from '@/Components/ConfirmDialog';

type Teacher = {
    id: number;
    name: string;
    nip: string;
    email: string;
    phone: string;
    is_active: boolean;
    classroom: string | null;
    account_status?: string;
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
    classrooms: { id: number; name: string }[];
    filters: { search?: string };
    academicYear?: string | null;
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [resetBusy, setResetBusy] = useState(false);

    const form = useForm({
        name: '',
        nip: '',
        email: '',
        phone: '',
        classroom_id: '',
    });

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
        <AdminLayout>
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
                                    className="absolute right-12 inset-y-0 flex items-center text-xs text-stone-400 hover:text-stone-600"
                                >
                                    ✕
                                </button>
                            )}
                            <button
                                type="submit"
                                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-full bg-stone-200 hover:bg-stone-300 text-xs font-medium text-stone-700 transition-colors"
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
                                        <th className="py-4 px-4">Wali kelas</th>
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
                                                <td className="py-4 px-4 text-stone-800">{teacher.classroom ?? '—'}</td>
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
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedTeacher(teacher)}
                                                        className="text-sm font-semibold text-[#0071E3] hover:underline"
                                                    >
                                                        Reset kata sandi
                                                    </button>
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
                                    const isPrev = link.label.includes('Previous') || link.label.includes('Sebelumnya') || link.label.includes('&laquo;');
                                    const isNext = link.label.includes('Next') || link.label.includes('Selanjutnya') || link.label.includes('&raquo;');
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
            {drawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
                    <div
                        className="fixed inset-0 bg-black/40 transition-opacity"
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-100">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
                                <h2 id="drawer-title" className="text-xl font-bold text-stone-900 tracking-tight">
                                    Tambah guru
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
                                    className="text-sm font-semibold text-stone-500 hover:text-stone-800"
                                >
                                    Tutup
                                </button>
                            </div>

                            <form onSubmit={handleTeacherSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
                                        placeholder="nama@tunas-harapan.sch.id"
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
                                    <label htmlFor="t_classroom_id" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Wali kelas
                                    </label>
                                    <select
                                        id="t_classroom_id"
                                        value={form.data.classroom_id}
                                        onChange={e => form.setData('classroom_id', e.target.value)}
                                        className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                    >
                                        <option value="">Bukan wali kelas</option>
                                        {classrooms.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    {form.data.classroom_id && (
                                        <p className="mt-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/70">
                                            Guru lama tidak lagi bisa mengisi jurnal kelas ini.
                                        </p>
                                    )}
                                    {form.errors.classroom_id && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.classroom_id}</p>
                                    )}
                                </div>

                                <div className="text-xs text-stone-500 pt-2 leading-relaxed">
                                    • Akun guru dibuat otomatis. Kata sandi sementara dikirim ke email di atas dan ditampilkan sekali.
                                </div>

                                <div className="pt-6 border-t border-stone-100 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDrawerOpen(false)}
                                        className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
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
                </div>
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
        </AdminLayout>
    );
}
