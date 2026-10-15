import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { X } from 'lucide-react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import SegmentedControl from '@/Components/SegmentedControl';
import ConfirmDialog from '@/Components/ConfirmDialog';

type Student = { id: number; name: string; classroom?: string | null };

type Guardian = {
    id: number;
    name: string;
    email: string;
    phone: string;
    address?: string;
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
    const [editing, setEditing] = useState<Guardian | null>(null);
    const [accountAction, setAccountAction] = useState<Guardian | null>(null);
    const editForm = useForm({ name: '', email: '', phone: '', address: '' });

    const openEdit = (guardian: Guardian) => {
        setEditing(guardian);
        editForm.setData({ name: guardian.name, email: guardian.email, phone: guardian.phone ?? '', address: guardian.address ?? '' });
        editForm.clearErrors();
    };

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
        <>
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
                                className="w-full pl-10 pr-20 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-white transition-all text-stone-900 placeholder:text-stone-400"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(''); filter({ search: '' }); }}
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
                                    className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--primary)] hover:underline"
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
                                                    <div className="flex justify-end gap-3">
                                                    <button type="button" onClick={() => openEdit(guardian)} className="text-sm font-semibold text-[var(--primary)] hover:underline">Ubah</button>
                                                    <button type="button" onClick={() => setAccountAction(guardian)} className="text-sm font-semibold text-stone-600 hover:underline">{guardian.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelected(guardian)}
                                                        className="text-sm font-semibold text-[var(--primary)] hover:underline"
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
                                            <button type="button" onClick={() => openEdit(guardian)} className="text-xs font-semibold text-[var(--primary)] hover:underline">Ubah</button>
                                            <button type="button" onClick={() => setAccountAction(guardian)} className="ml-3 text-xs font-semibold text-stone-600 hover:underline">{guardian.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                                            <button
                                                type="button"
                                                onClick={() => setSelected(guardian)}
                                                className="text-xs font-semibold text-[var(--primary)] hover:underline"
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
                                                    ? 'bg-[var(--primary)] text-white shadow-sm'
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
            <ConfirmDialog
                open={!!accountAction}
                title={`${accountAction?.is_active ? 'Nonaktifkan' : 'Aktifkan kembali'} akun ${accountAction?.name}?`}
                description={accountAction?.is_active ? 'Akun tidak dapat masuk dan tidak akan menerima tagihan baru.' : 'Akun dapat masuk kembali setelah diaktifkan.'}
                confirmLabel={accountAction?.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                onCancel={() => setAccountAction(null)}
                onConfirm={() => { if (accountAction) router.post(`/admin/orang-tua/${accountAction.id}/${accountAction.is_active ? 'nonaktifkan' : 'aktifkan'}`, {}, { onSuccess: () => setAccountAction(null) }); }}
            />
            {editing && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
                    <form className="w-full max-w-lg rounded-3xl bg-white p-6 space-y-4" onSubmit={(event) => { event.preventDefault(); editForm.put(`/admin/orang-tua/${editing.id}`, { onSuccess: () => setEditing(null) }); }}>
                        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Ubah data orang tua</h2><button type="button" onClick={() => setEditing(null)}><X /></button></div>
                        {(['name', 'email', 'phone', 'address'] as const).map((field) => <div key={field}><label className="block text-sm font-medium mb-1" htmlFor={`guardian-${field}`}>{field === 'name' ? 'Nama' : field === 'email' ? 'Email' : field === 'phone' ? 'Nomor HP' : 'Alamat'}</label><input id={`guardian-${field}`} value={editForm.data[field]} onChange={(event) => editForm.setData(field, event.target.value)} className="w-full rounded-xl border border-stone-200 px-4 py-3" required={field !== 'address'} />{editForm.errors[field] && <p className="text-sm text-red-600 mt-1">{editForm.errors[field]}</p>}</div>)}
                        <div className="flex justify-end gap-3"><button type="button" className="button-secondary" onClick={() => setEditing(null)}>Batal</button><button className="button-primary" disabled={editForm.processing}>Simpan</button></div>
                    </form>
                </div>
            )}
        </>
    );
}

Guardians.layout = getAdminLayout;

