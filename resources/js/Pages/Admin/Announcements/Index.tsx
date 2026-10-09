import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Pin, Plus, X } from 'lucide-react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import SegmentedControl from '@/Components/SegmentedControl';
import ConfirmDialog from '@/Components/ConfirmDialog';

type Announcement = {
    id: number;
    title: string;
    body: string;
    status: string;
    is_pinned: boolean;
    classroom_name?: string | null;
    published_at?: string | null;
    expires_at?: string | null;
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

export default function Index({
    announcements,
    filters,
    counts,
}: {
    announcements: PageData<Announcement>;
    filters: { status?: string; search?: string };
    counts?: { all: number; terbit: number; draf: number };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [deletingItem, setDeletingItem] = useState<Announcement | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const filter = (change: Record<string, string>) => {
        router.get('/admin/pengumuman', { ...filters, ...change }, { preserveState: true, replace: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        filter({ search: search.trim() });
    };

    const handleClearFilters = () => {
        setSearch('');
        router.get('/admin/pengumuman', {}, { preserveState: true, replace: true });
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return 'Belum terbit';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const allCount = counts?.all ?? announcements.total;
    const publishedCount = counts?.terbit ?? announcements.data.filter(a => a.status === 'terbit').length;
    const draftCount = counts?.draf ?? announcements.data.filter(a => a.status === 'draf').length;

    const segmentOptions = [
        `Semua (${allCount})`,
        `Terbit (${publishedCount})`,
        `Draf (${draftCount})`,
    ];

    const currentSegment =
        filters.status === 'terbit'
            ? `Terbit (${publishedCount})`
            : filters.status === 'draf'
            ? `Draf (${draftCount})`
            : `Semua (${allCount})`;

    return (
        <>
            <Head title="Daftar Pengumuman" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                        Manajemen Informasi
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mt-1">
                        Daftar Pengumuman
                    </h1>
                    <p className="text-stone-500 mt-1 text-sm md:text-base">
                        {announcements.total} total entri
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <label htmlFor="search" className="sr-only">Cari pengumuman</label>
                        <input
                            id="search"
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari pengumuman..."
                            className="w-full sm:w-64 pl-9 pr-8 py-2 text-sm bg-white border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-stone-900 placeholder:text-stone-400"
                        />
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        {search && (
                            <button
                                type="button"
                                onClick={() => { setSearch(''); filter({ search: '' }); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 !min-h-0 h-5 w-5 flex items-center justify-center text-xs text-stone-400 hover:text-stone-600"
                            >
                                <X size={13} strokeWidth={2} />
                            </button>
                        )}
                    </form>

                    <Link
                        href="/admin/pengumuman/create"
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-sm shrink-0"
                    >
                        <Plus size={16} strokeWidth={2} />
                        <span>Buat Pengumuman</span>
                    </Link>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="mb-6 flex items-center justify-between">
                <SegmentedControl
                    options={segmentOptions}
                    value={currentSegment}
                    onChange={val => {
                        if (val.startsWith('Terbit')) filter({ status: 'terbit' });
                        else if (val.startsWith('Draf')) filter({ status: 'draf' });
                        else filter({ status: '' });
                    }}
                />
            </div>

            {/* Announcements List Container */}
            <section className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
                {announcements.data.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                        </div>
                        {filters.search || filters.status ? (
                            <>
                                <p className="text-base font-semibold text-stone-900">
                                    {filters.search
                                        ? `Tidak ada pengumuman dengan kata kunci ‘${filters.search}’.`
                                        : 'Tidak ada pengumuman yang sesuai dengan filter.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="mt-4 inline-flex items-center text-sm font-semibold text-[#0071E3] hover:underline"
                                >
                                    Hapus pencarian
                                </button>
                            </>
                        ) : (
                            <p className="text-stone-500 text-sm">Belum ada pengumuman yang dibuat.</p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-stone-100">
                        {announcements.data.map(item => (
                            <div
                                key={item.id}
                                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
                            >
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <h2 className="text-base font-bold text-stone-900">
                                            {item.title}
                                        </h2>
                                        <StatusCapsule status={item.status} />
                                        {item.is_pinned && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
                                                <Pin size={11} strokeWidth={2} className="rotate-45" /> Disematkan
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-stone-500">
                                        {item.status === 'terbit'
                                            ? `Terbit ${formatDate(item.published_at)}`
                                            : 'Draf'}
                                        {' · '}Untuk: {item.classroom_name ?? 'Semua orang tua'}
                                        {item.expires_at && ` · Berakhir ${formatDate(item.expires_at)}`}
                                    </p>
                                </div>

                                <div className="flex flex-row items-center justify-end gap-2 shrink-0 self-end md:self-auto">
                                    <Link
                                        href={`/admin/pengumuman/${item.id}/edit`}
                                        className="inline-flex items-center justify-center !min-h-0 h-8 px-3.5 rounded-full text-xs font-semibold text-[#0071E3] bg-[#0071E3]/10 hover:bg-[#0071E3]/20 active:scale-[0.98] transition-all"
                                    >
                                        Ubah
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setDeletingItem(item)}
                                        className="inline-flex items-center justify-center !min-h-0 h-8 px-3.5 rounded-full text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-[0.98] transition-all"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination Footer */}
                {announcements.total > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-stone-100 text-sm text-stone-500">
                        <p>
                            Menampilkan {announcements.from ?? 0}–{announcements.to ?? 0} dari {announcements.total} pengumuman
                        </p>
                        <nav className="inline-flex items-center gap-1.5" aria-label="Navigasi halaman">
                            {announcements.links.map((link, idx) => {
                                const isPrev = link.label.toLowerCase().includes('previous') || link.label.includes('Sebelumnya') || link.label.includes('&laquo;');
                                const isNext = link.label.toLowerCase().includes('next') || link.label.includes('Selanjutnya') || link.label.includes('&raquo;');
                                const renderLabel = () => {
                                    if (isPrev) return <ChevronLeft size={14} strokeWidth={2} />;
                                    if (isNext) return <ChevronRight size={14} strokeWidth={2} />;
                                    return link.label;
                                };

                                if (!link.url) {
                                    return (
                                        <span
                                            key={idx}
                                            className="w-8 h-8 flex items-center justify-center rounded-full text-xs text-stone-300 font-medium select-none"
                                        >
                                            {renderLabel()}
                                        </span>
                                    );
                                }

                                return (
                                    <Link
                                        key={idx}
                                        href={link.url}
                                        preserveState
                                        replace
                                        className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                            link.active
                                                ? 'bg-[#0071E3] text-white shadow-sm'
                                                : 'text-stone-700 hover:bg-stone-100'
                                        }`}
                                    >
                                        {renderLabel()}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </section>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={!!deletingItem}
                title="Hapus pengumuman?"
                description={
                    <span>
                        Pengumuman <strong>‘{deletingItem?.title}’</strong> akan dihapus permanen dari sistem dan tidak dapat dikembalikan.
                    </span>
                }
                confirmLabel="Hapus"
                danger
                busy={deleteBusy}
                onCancel={() => setDeletingItem(null)}
                onConfirm={() => {
                    if (deletingItem) {
                        router.delete(`/admin/pengumuman/${deletingItem.id}`, {
                            onStart: () => setDeleteBusy(true),
                            onFinish: () => setDeleteBusy(false),
                            onSuccess: () => setDeletingItem(null),
                        });
                    }
                }}
            />
        </>
    );
}

Index.layout = getAdminLayout;

