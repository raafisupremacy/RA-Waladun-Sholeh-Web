import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import SegmentedControl from '@/Components/SegmentedControl';
import ConfirmDialog from '@/Components/ConfirmDialog';

type Student = {
    id: number;
    name: string;
    nis: string;
    status: string;
    classroom: string | null;
    birth_date?: string | null;
    gender?: string | null;
    guardians: { name: string; phone: string; relationship?: string }[];
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

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('');
}

export default function Students({
    students,
    classrooms,
    filters,
}: {
    students: PageData<Student>;
    classrooms: { id: number; name: string }[];
    filters: { search?: string; status?: string; classroom_id?: string };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedForDeactivate, setSelectedForDeactivate] = useState<Student | null>(null);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

    const filter = (change: Record<string, string>) => {
        router.get('/admin/siswa', { ...filters, ...change }, { preserveState: true, replace: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        filter({ search: search.trim() });
    };

    const handleClearFilters = () => {
        setSearch('');
        router.get('/admin/siswa', {}, { preserveState: true, replace: true });
    };

    const classroomOptions = ['Semua', ...classrooms.map(c => c.name)];
    const currentClassroomName = filters.classroom_id
        ? classrooms.find(c => String(c.id) === String(filters.classroom_id))?.name ?? 'Semua'
        : 'Semua';

    const statusOptions = ['Semua', 'Aktif', 'Nonaktif'];
    const currentStatus = filters.status === 'aktif' ? 'Aktif' : filters.status === 'nonaktif' ? 'Nonaktif' : 'Semua';

    return (
        <AdminLayout>
            <Head title="Data Siswa" />

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">Data Siswa</h1>
                    <p className="text-stone-500 mt-1 text-sm md:text-base">{students.total} siswa terdaftar</p>
                </div>
                <Link
                    href="/admin/siswa/create"
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-sm self-start md:self-auto"
                >
                    Tambah siswa
                </Link>
            </header>

            <section className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden p-6 md:p-8">
                {/* Search and Filters Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                        <label htmlFor="search" className="sr-only">Cari nama atau NIS</label>
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
                                placeholder="Cari nama atau NIS"
                                className="w-full pl-10 pr-20 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900 placeholder:text-stone-400"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(''); filter({ search: '' }); }}
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

                    <div className="flex flex-wrap items-center gap-3">
                        <SegmentedControl
                            options={classroomOptions}
                            value={currentClassroomName}
                            onChange={val => {
                                if (val === 'Semua') {
                                    filter({ classroom_id: '' });
                                } else {
                                    const match = classrooms.find(c => c.name === val);
                                    if (match) filter({ classroom_id: String(match.id) });
                                }
                            }}
                        />

                        <SegmentedControl
                            options={statusOptions}
                            value={currentStatus}
                            onChange={val => {
                                filter({ status: val === 'Semua' ? '' : val.toLowerCase() });
                            }}
                        />
                    </div>
                </div>

                {/* Content Area */}
                {students.data.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        {filters.search || filters.status || filters.classroom_id ? (
                            <>
                                <p className="text-base font-semibold text-stone-900">
                                    {filters.search
                                        ? `Tidak ada siswa dengan kata kunci ‘${filters.search}’.`
                                        : 'Tidak ada siswa yang sesuai dengan filter.'}
                                </p>
                                <p className="text-sm text-stone-500 mt-1">Coba periksa kembali ejaan atau atur ulang penyaring.</p>
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="mt-4 inline-flex items-center text-sm font-semibold text-[#0071E3] hover:underline"
                                >
                                    Hapus pencarian
                                </button>
                            </>
                        ) : (
                            <p className="text-stone-500 text-sm">Belum ada data siswa terdaftar.</p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto mt-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-100 text-xs font-semibold uppercase tracking-wider text-stone-400">
                                        <th className="py-4 px-3">Siswa</th>
                                        <th className="py-4 px-3">NIS</th>
                                        <th className="py-4 px-3">Kelas</th>
                                        <th className="py-4 px-3">Orang Tua / Wali</th>
                                        <th className="py-4 px-3">Telepon</th>
                                        <th className="py-4 px-3">Status</th>
                                        <th className="py-4 px-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                                    {students.data.map(student => {
                                        const guardian = student.guardians[0];
                                        const guardianDisplay = guardian
                                            ? `${guardian.name}${guardian.relationship ? ` (${guardian.relationship})` : ''}`
                                            : '—';
                                        const phoneDisplay = guardian?.phone || '—';

                                        return (
                                            <tr key={student.id} className="hover:bg-stone-50/70 transition-colors">
                                                <td className="py-4 px-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
                                                                student.status === 'aktif'
                                                                    ? 'bg-blue-100 text-[#0071E3]'
                                                                    : 'bg-stone-100 text-stone-500'
                                                            }`}
                                                        >
                                                            {getInitials(student.name)}
                                                        </div>
                                                        <span className="font-semibold text-stone-900">{student.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-3 text-stone-500 font-mono text-xs">{student.nis}</td>
                                                <td className="py-4 px-3 text-stone-800">{student.classroom ?? 'Belum ada kelas'}</td>
                                                <td className="py-4 px-3 text-stone-800">{guardianDisplay}</td>
                                                <td className="py-4 px-3 text-stone-500">{phoneDisplay}</td>
                                                <td className="py-4 px-3">
                                                    <StatusCapsule status={student.status} />
                                                </td>
                                                <td className="py-4 px-3 text-right">
                                                    <div className="relative inline-flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingStudent(student)}
                                                            className="text-sm font-semibold text-[#0071E3] hover:underline"
                                                        >
                                                            Lihat
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingStudent(student)}
                                                            className="text-sm font-semibold text-[#0071E3] hover:underline"
                                                        >
                                                            Ubah
                                                        </button>

                                                        {student.status === 'aktif' && (
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveMenuId(activeMenuId === student.id ? null : student.id)}
                                                                    className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                                                                    aria-label="Menu tindakan"
                                                                >
                                                                    •••
                                                                </button>
                                                                {activeMenuId === student.id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-20"
                                                                            onClick={() => setActiveMenuId(null)}
                                                                        />
                                                                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-2xl shadow-xl border border-stone-200/80 py-1.5 z-30 text-left">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActiveMenuId(null);
                                                                                    setSelectedForDeactivate(student);
                                                                                }}
                                                                                className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                                                            >
                                                                                Nonaktifkan
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Stacked Card View */}
                        <div className="md:hidden divide-y divide-stone-100 mt-2">
                            {students.data.map(student => {
                                const guardian = student.guardians[0];
                                const guardianDisplay = guardian
                                    ? `${guardian.name}${guardian.relationship ? ` (${guardian.relationship})` : ''}`
                                    : '—';
                                const phoneDisplay = guardian?.phone || '—';

                                return (
                                    <div key={student.id} className="py-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
                                                        student.status === 'aktif'
                                                            ? 'bg-blue-100 text-[#0071E3]'
                                                            : 'bg-stone-100 text-stone-500'
                                                    }`}
                                                >
                                                    {getInitials(student.name)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-stone-900 text-sm">{student.name}</h3>
                                                    <p className="text-xs text-stone-500 font-mono">NIS {student.nis}</p>
                                                </div>
                                            </div>
                                            <StatusCapsule status={student.status} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50/80 rounded-2xl p-3 border border-stone-100">
                                            <div>
                                                <span className="text-stone-400 block">Kelas</span>
                                                <span className="font-medium text-stone-800">{student.classroom ?? '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-stone-400 block">Orang Tua / Wali</span>
                                                <span className="font-medium text-stone-800">{guardianDisplay}</span>
                                            </div>
                                            <div className="col-span-2 pt-1">
                                                <span className="text-stone-400 block">Telepon</span>
                                                <span className="font-medium text-stone-800">{phoneDisplay}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-3 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setViewingStudent(student)}
                                                className="text-xs font-semibold text-[#0071E3] hover:underline"
                                            >
                                                Lihat
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setViewingStudent(student)}
                                                className="text-xs font-semibold text-[#0071E3] hover:underline"
                                            >
                                                Ubah
                                            </button>
                                            {student.status === 'aktif' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedForDeactivate(student)}
                                                    className="text-xs font-semibold text-red-600 hover:underline"
                                                >
                                                    Nonaktifkan
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-stone-100 text-sm text-stone-500">
                            <p>
                                Menampilkan {students.from ?? 0}–{students.to ?? 0} dari {students.total} siswa
                            </p>
                            <nav className="inline-flex items-center gap-1.5" aria-label="Navigasi halaman">
                                {students.links.map((link, idx) => {
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

            {/* Student Detail Modal */}
            {viewingStudent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="student-detail-title"
                >
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-left border border-stone-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-[#0071E3] flex items-center justify-center font-bold text-base">
                                {getInitials(viewingStudent.name)}
                            </div>
                            <div>
                                <h2 id="student-detail-title" className="text-xl font-bold text-stone-900">
                                    {viewingStudent.name}
                                </h2>
                                <p className="text-xs text-stone-500 font-mono">NIS {viewingStudent.nis}</p>
                            </div>
                        </div>

                        <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-stone-200/60 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-stone-500">Kelas</span>
                                <span className="font-semibold text-stone-900">{viewingStudent.classroom ?? '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-500">Status</span>
                                <StatusCapsule status={viewingStudent.status} />
                            </div>
                            {viewingStudent.birth_date && (
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Tanggal Lahir</span>
                                    <span className="font-semibold text-stone-900">{viewingStudent.birth_date}</span>
                                </div>
                            )}
                            {viewingStudent.gender && (
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Jenis Kelamin</span>
                                    <span className="font-semibold text-stone-900">
                                        {viewingStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                                    </span>
                                </div>
                            )}
                            {viewingStudent.guardians[0] && (
                                <>
                                    <div className="border-t border-stone-200/70 pt-2 flex justify-between">
                                        <span className="text-stone-500">Orang Tua / Wali</span>
                                        <span className="font-semibold text-stone-900">
                                            {viewingStudent.guardians[0].name}
                                            {viewingStudent.guardians[0].relationship ? ` (${viewingStudent.guardians[0].relationship})` : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-stone-500">Nomor Telepon</span>
                                        <span className="font-semibold text-stone-900">{viewingStudent.guardians[0].phone}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setViewingStudent(null)}
                                className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deactivation Confirmation Dialog */}
            <ConfirmDialog
                open={!!selectedForDeactivate}
                title="Nonaktifkan siswa?"
                description={
                    <span>
                        <strong>{selectedForDeactivate?.name}</strong> tidak akan menerima tagihan baru. Riwayat siswa dan
                        jurnal tetap tersimpan di sistem.
                    </span>
                }
                confirmLabel="Nonaktifkan"
                danger
                busy={busy}
                onCancel={() => setSelectedForDeactivate(null)}
                onConfirm={() => {
                    if (selectedForDeactivate) {
                        router.post(
                            `/admin/siswa/${selectedForDeactivate.id}/nonaktifkan`,
                            {},
                            {
                                onStart: () => setBusy(true),
                                onFinish: () => setBusy(false),
                                onSuccess: () => setSelectedForDeactivate(null),
                            }
                        );
                    }
                }}
            />
        </AdminLayout>
    );
}
