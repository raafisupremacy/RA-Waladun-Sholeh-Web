import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import SegmentedControl from '@/Components/SegmentedControl';
import ConfirmDialog from '@/Components/ConfirmDialog';

type Student = { id: number; name: string; classroom?: string | null };

type Guardian = {
    id: number;
    name: string;
    email: string;
    phone: string;
    is_active: boolean;
    account_status?: string;
    students: Student[];
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

export default function Guardians({
    guardians,
    filters,
    academicYear,
}: {
    guardians: PageData<Guardian>;
    filters: { search?: string; status?: string };
    academicYear?: string | null;
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selected, setSelected] = useState<Guardian | null>(null);
    const [busy, setBusy] = useState(false);

    const filter = (change: Record<string, string>) => {
        router.get('/admin/orang-tua', { ...filters, ...change }, { preserveState: true, replace: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        filter({ search: search.trim() });
    };

    const handleClearFilters = () => {
        setSearch('');
        router.get('/admin/orang-tua', {}, { preserveState: true, replace: true });
    };

    const statusOptions = ['Semua', 'Aktif', 'Belum pernah masuk', 'Nonaktif'];
    const currentStatus =
        filters.status === 'aktif'
            ? 'Aktif'
            : filters.status === 'belum_masuk'
            ? 'Belum pernah masuk'
            : filters.status === 'nonaktif'
            ? 'Nonaktif'
            : 'Semua';

    const formatChild = (s: Student) => {
        if (!s.classroom) return s.name;
        const shortClass = s.classroom.replace('Kelompok ', '');
        return `${s.name} (${shortClass})`;
    };

    return (
        <AdminLayout>
            <Head title="Data Orang Tua" />

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">Data Orang Tua</h1>
                    <p className="text-stone-500 mt-1 text-sm md:text-base">{guardians.total} akun orang tua dan wali</p>
                </div>
                {academicYear && (
                    <span className="self-start md:self-auto px-4 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold tracking-wide">
                        Tahun Ajaran {academicYear}
                    </span>
                )}
            </header>

            <section className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden p-6 md:p-8">
                {/* Search & Filter Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                        <label htmlFor="search" className="sr-only">Cari nama, email, atau nama anak</label>
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
                                placeholder="Cari nama, email, atau nama anak"
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

                    <div>
                        <SegmentedControl
                            options={statusOptions}
                            value={currentStatus}
                            onChange={val => {
                                const map: Record<string, string> = {
                                    'Semua': '',
                                    'Aktif': 'aktif',
                                    'Belum pernah masuk': 'belum_masuk',
                                    'Nonaktif': 'nonaktif',
                                };
                                filter({ status: map[val] ?? '' });
                            }}
                        />
                    </div>
                </div>

                {/* Content */}
                {guardians.data.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        {filters.search || filters.status ? (
                            <>
                                <p className="text-base font-semibold text-stone-900">
                                    {filters.search
                                        ? `Tidak ada orang tua dengan kata kunci ‘${filters.search}’.`
                                        : 'Tidak ada orang tua yang sesuai dengan filter.'}
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
                            <p className="text-stone-500 text-sm">Belum ada akun orang tua terdaftar.</p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto mt-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-100 text-xs font-semibold uppercase tracking-wider text-stone-400">
                                        <th className="py-4 px-3">Nama</th>
                                        <th className="py-4 px-3">Email</th>
                                        <th className="py-4 px-3">No. HP</th>
                                        <th className="py-4 px-3">Anak</th>
                                        <th className="py-4 px-3">Status akun</th>
                                        <th className="py-4 px-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                                    {guardians.data.map(guardian => {
                                        const childrenDisplay = guardian.students.length > 0
                                            ? guardian.students.map(formatChild).join(', ')
                                            : '—';

                                        const status = guardian.account_status ?? (guardian.is_active ? 'aktif' : 'nonaktif');

                                        return (
                                            <tr key={guardian.id} className="hover:bg-stone-50/70 transition-colors">
                                                <td className="py-4 px-3 font-semibold text-stone-900">{guardian.name}</td>
                                                <td className="py-4 px-3 text-stone-500 text-xs">{guardian.email}</td>
                                                <td className="py-4 px-3 text-stone-600">{guardian.phone || '—'}</td>
                                                <td className="py-4 px-3 text-stone-800">{childrenDisplay}</td>
                                                <td className="py-4 px-3">
                                                    {status === 'belum_masuk' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                            Belum pernah masuk
                                                        </span>
                                                    ) : (
                                                        <StatusCapsule status={status} />
                                                    )}
                                                </td>
                                                <td className="py-4 px-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelected(guardian)}
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

                        {/* Mobile Stacked Card View */}
                        <div className="md:hidden divide-y divide-stone-100 mt-2">
                            {guardians.data.map(guardian => {
                                const childrenDisplay = guardian.students.length > 0
                                    ? guardian.students.map(formatChild).join(', ')
                                    : '—';
                                const status = guardian.account_status ?? (guardian.is_active ? 'aktif' : 'nonaktif');

                                return (
                                    <div key={guardian.id} className="py-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-stone-900 text-sm">{guardian.name}</h3>
                                                <p className="text-xs text-stone-500">{guardian.email}</p>
                                            </div>
                                            {status === 'belum_masuk' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                                                    Belum pernah masuk
                                                </span>
                                            ) : (
                                                <StatusCapsule status={status} />
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50/80 rounded-2xl p-3 border border-stone-100">
                                            <div>
                                                <span className="text-stone-400 block">No. HP</span>
                                                <span className="font-medium text-stone-800">{guardian.phone || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-stone-400 block">Anak</span>
                                                <span className="font-medium text-stone-800">{childrenDisplay}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setSelected(guardian)}
                                                className="text-xs font-semibold text-[#0071E3] hover:underline"
                                            >
                                                Reset kata sandi
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-stone-100 text-sm text-stone-500">
                            <p>
                                Menampilkan {guardians.from ?? 0}–{guardians.to ?? 0} dari {guardians.total} orang tua
                            </p>
                            <nav className="inline-flex items-center gap-1.5" aria-label="Navigasi halaman">
                                {guardians.links.map((link, idx) => {
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

            {/* Reset Password Confirmation Dialog (06B) */}
            <ConfirmDialog
                open={!!selected}
                title={`Reset kata sandi ${selected?.name}?`}
                description={
                    <span>
                        Kata sandi sementara baru akan dibuat untuk <strong>{selected?.email}</strong>. Kata sandi lama
                        langsung tidak berlaku.
                    </span>
                }
                confirmLabel="Reset"
                busy={busy}
                onCancel={() => setSelected(null)}
                onConfirm={() => {
                    if (selected) {
                        router.post(
                            `/admin/orang-tua/${selected.id}/reset-kata-sandi`,
                            {},
                            {
                                onStart: () => setBusy(true),
                                onFinish: () => setBusy(false),
                                onSuccess: () => setSelected(null),
                            }
                        );
                    }
                }}
            />
        </AdminLayout>
    );
}
