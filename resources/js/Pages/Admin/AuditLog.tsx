import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Calendar, Eye, Filter, RotateCcw, Search, ShieldAlert, X } from 'lucide-react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import Tile from '@/Components/Tile';
import BigNumber from '@/Components/BigNumber';
import ResponsiveTable from '@/Components/ResponsiveTable';
import Pagination, { PageData } from '@/Components/Pagination';
import EmptyState from '@/Components/EmptyState';
import CustomSelect from '@/Components/CustomSelect';

type AuditLogItem = {
    id: number;
    user: { id: number; name: string; email: string } | null;
    action: string;
    entity_type: string;
    entity_id: number | string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    created_at: string | null;
};

type Props = {
    logs: PageData<AuditLogItem>;
    filters: {
        search?: string;
        action?: string;
        entity_type?: string;
        start_date?: string;
        end_date?: string;
    };
    availableActions: string[];
    availableEntities: string[];
    stats: {
        total: number;
        today: number;
    };
};

const actionConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    account_created: { label: 'Akun Dibuat', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
    password_reset: { label: 'Reset Sandi', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
    teacher_classroom_assigned: { label: 'Guru Ditugaskan', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/60' },
    teacher_classroom_unassigned: { label: 'Guru Dilepas', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
    homeroom_changed: { label: 'Wali Kelas Diubah', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/60' },
    student_moved: { label: 'Siswa Pindah Kelas', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/60' },
    deactivated: { label: 'Akun Dinonaktifkan', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/60' },
    invoices_generated: { label: 'Generate Tagihan', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/60' },
    invoice_amount_updated: { label: 'Ubah Nominal SPP', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
    payment_submitted: { label: 'Bukti Diunggah', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
    invoice_status_changed: { label: 'Status Tagihan', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
    payment_approved: { label: 'Pembayaran Disetujui', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
    payment_rejected: { label: 'Pembayaran Ditolak', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/60' },
    announcement_created: { label: 'Pengumuman Dibuat', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
    announcement_updated: { label: 'Pengumuman Diubah', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/60' },
    anecdotal_note_created: { label: 'Catatan Anekdot Dibuat', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
    anecdotal_note_updated: { label: 'Catatan Anekdot Diubah', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/60' },
};

function formatActionLabel(raw: string) {
    if (actionConfig[raw]) {
        return actionConfig[raw];
    }
    const clean = raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return { label: clean, bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' };
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    const date = new Date(iso);
    return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

const fieldLabels: Record<string, string> = {
    classroom_name: 'Nama Kelas',
    classroom_id: 'Kelas',
    role: 'Peran / Penugasan',
    teacher_id: 'ID Guru',
    teacher_name: 'Nama Guru',
    student_id: 'ID Siswa',
    student_name: 'Nama Siswa',
    academic_year_id: 'ID Tahun Ajaran',
    academic_year_name: 'Tahun Ajaran',
    amount: 'Nominal Awal',
    discount_amount: 'Potongan / Diskon',
    net_amount: 'Nominal Akhir',
    due_date: 'Tanggal Jatuh Tempo',
    month: 'Bulan Periode',
    period_month: 'Bulan Periode',
    year: 'Tahun Periode',
    period_year: 'Tahun Periode',
    status: 'Status',
    receipt_number: 'Nomor Kuitansi',
    reason: 'Alasan Penolakan',
    rejection_reason: 'Alasan Penolakan',
    name: 'Nama',
    email: 'Alamat Email',
    nis: 'NIS (Nomor Induk Siswa)',
    phone: 'Nomor Telepon',
    address: 'Alamat',
    gender: 'Jenis Kelamin',
    birth_date: 'Tanggal Lahir',
    birth_place: 'Tempat Lahir',
    title: 'Judul Pengumuman',
    body: 'Isi Konten',
    is_pinned: 'Status Sematan',
    target_type: 'Sasaran',
    count: 'Jumlah Data',
    created: 'Tagihan Berhasil Dibuat',
    skipped: 'Dilewati (Sudah Ada)',
    note: 'Catatan',
};

const roleLabels: Record<string, string> = {
    wali_kelas: 'Wali Kelas',
    pendamping: 'Guru Pendamping',
    guru: 'Guru',
    admin: 'Admin Tata Usaha',
    kepala_sekolah: 'Kepala Sekolah',
    orang_tua: 'Orang Tua',
};

const statusLabels: Record<string, { label: string; color: string }> = {
    lunas: { label: 'Lunas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    menunggu_verifikasi: { label: 'Menunggu Verifikasi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    pending: { label: 'Menunggu Verifikasi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    belum_bayar: { label: 'Belum Bayar', color: 'bg-stone-100 text-stone-700 border-stone-200' },
    ditolak: { label: 'Ditolak', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    aktif: { label: 'Aktif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    nonaktif: { label: 'Nonaktif', color: 'bg-stone-100 text-stone-600 border-stone-200' },
};

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function formatFieldKey(key: string): string {
    if (fieldLabels[key]) return fieldLabels[key];
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatHumanValue(key: string, val: unknown): React.ReactNode {
    if (val === null || val === undefined) return <span className="text-stone-400 italic">—</span>;
    if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';

    const strVal = String(val);

    if ((key === 'month' || key === 'period_month') && typeof val === 'number') {
        return monthNames[val - 1] ?? strVal;
    }

    if (key.includes('amount') || key.includes('spp') || key.includes('nominal')) {
        const num = Number(val);
        if (!isNaN(num)) {
            return <span className="font-semibold text-stone-900">Rp {num.toLocaleString('id-ID')}</span>;
        }
    }

    if (key === 'role' && typeof val === 'string' && roleLabels[val]) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                {roleLabels[val]}
            </span>
        );
    }

    if (key === 'status' && typeof val === 'string' && statusLabels[val]) {
        const st = statusLabels[val];
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${st.color}`}>
                {st.label}
            </span>
        );
    }

    if (key.includes('date') && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    }

    if (Array.isArray(val)) {
        return val.join(', ');
    }

    if (typeof val === 'object') {
        return JSON.stringify(val);
    }

    return strVal;
}

function filterDisplayEntries(data: Record<string, unknown>): [string, unknown][] {
    const entries = Object.entries(data);
    const hasClassroomName = 'classroom_name' in data;
    const hasStudentName = 'student_name' in data;
    const hasTeacherName = 'teacher_name' in data;

    return entries.filter(([key]) => {
        if (hasClassroomName && key === 'classroom_id') return false;
        if (hasStudentName && key === 'student_id') return false;
        if (hasTeacherName && key === 'teacher_id') return false;
        return true;
    });
}

export default function AuditLog({ logs, filters, availableActions, availableEntities, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [actionFilter, setActionFilter] = useState(filters.action ?? '');
    const [entityFilter, setEntityFilter] = useState(filters.entity_type ?? '');
    const [startDate, setStartDate] = useState(filters.start_date ?? '');
    const [endDate, setEndDate] = useState(filters.end_date ?? '');
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
    const [showRawPayload, setShowRawPayload] = useState(false);

    useEffect(() => {
        if (selectedLog) {
            setShowRawPayload(false);
            const orig = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = orig;
            };
        }
    }, [selectedLog]);

    const handleApplyFilters = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get('/admin/audit-log', {
            search: search.trim() || undefined,
            action: actionFilter || undefined,
            entity_type: entityFilter || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
        }, { preserveState: true, replace: true });
    };

    const handleResetFilters = () => {
        setSearch('');
        setActionFilter('');
        setEntityFilter('');
        setStartDate('');
        setEndDate('');
        router.get('/admin/audit-log', {}, { preserveState: true, replace: true });
    };

    const rows = logs.data.map(log => {
        const badge = formatActionLabel(log.action);
        const hasDiff = !!(log.old_values || log.new_values);

        return {
            id: log.id,
            waktu: (
                <div className="flex flex-col text-xs font-mono">
                    <span className="font-medium text-stone-900">{formatDateTime(log.created_at)}</span>
                    <span className="text-stone-400 text-[10px]">ID Log #{log.id}</span>
                </div>
            ),
            pengguna: log.user ? (
                <div className="flex flex-col">
                    <span className="font-semibold text-stone-900 text-xs sm:text-sm">{log.user.name}</span>
                    <span className="text-stone-400 text-xs">{log.user.email}</span>
                </div>
            ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
                    Sistem Otomatis
                </span>
            ),
            aksi: (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                    {badge.label}
                </span>
            ),
            entitas: (
                <div className="flex flex-col text-xs">
                    <span className="font-semibold text-stone-800">{log.entity_type}</span>
                    <span className="text-stone-400">Ref ID: {log.entity_id ?? '—'}</span>
                </div>
            ),
            detail: (
                <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    disabled={!hasDiff}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        hasDiff
                            ? 'bg-stone-100 text-stone-800 hover:bg-stone-200 hover:text-stone-900'
                            : 'bg-transparent text-stone-300 cursor-not-allowed'
                    }`}
                >
                    <Eye size={13} />
                    <span>Rincian</span>
                </button>
            ),
        };
    });

    return (
        <>
            <Head title="Audit Log Sistem" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                        Keamanan & Akuntabilitas
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mt-1">
                        Audit Log Sistem
                    </h1>
                    <p className="text-stone-500 mt-1 text-sm md:text-base">
                        Rekam jejak seluruh mutasi data, penagihan, verifikasi, dan administrasi sekolah.
                    </p>
                </div>
            </div>

            {/* Metric Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <Tile title="Total Riwayat Log">
                    <BigNumber label="Log Tercatat">{stats.total.toLocaleString('id-ID')}</BigNumber>
                    <p className="text-xs text-stone-500 mt-2">Seluruh transaksi dan aktivitas administratif tersimpan aman.</p>
                </Tile>
                <Tile title="Aktivitas Hari Ini">
                    <BigNumber label="Entri Baru">{stats.today.toLocaleString('id-ID')}</BigNumber>
                    <p className="text-xs text-stone-500 mt-2">Aktivitas sistem yang tercatat pada hari kalender ini.</p>
                </Tile>
            </div>

            {/* Main Data Panel */}
            <section className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden p-6 md:p-8">
                {/* Filter Toolbar */}
                <form onSubmit={handleApplyFilters} className="space-y-4 pb-6 mb-6 border-b border-stone-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                                <Search size={15} />
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari aksi, entitas, staf..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Action Filter */}
                        <CustomSelect
                            className="w-full"
                            buttonClassName="h-[42px] rounded-[16px] text-xs sm:text-sm"
                            value={actionFilter}
                            onChange={(val) => setActionFilter(String(val))}
                            options={[
                                { value: '', label: 'Semua jenis aksi' },
                                ...availableActions.map(a => ({
                                    value: a,
                                    label: formatActionLabel(a).label,
                                })),
                            ]}
                        />

                        {/* Entity Filter */}
                        <CustomSelect
                            className="w-full"
                            buttonClassName="h-[42px] rounded-[16px] text-xs sm:text-sm"
                            value={entityFilter}
                            onChange={(val) => setEntityFilter(String(val))}
                            options={[
                                { value: '', label: 'Semua entitas' },
                                ...availableEntities.map(e => ({
                                    value: e,
                                    label: e,
                                })),
                            ]}
                        />

                        {/* Date Range Start */}
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                title="Mulai tanggal"
                                className="w-full px-3 py-2 rounded-2xl border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                            />
                            <span className="text-stone-400 text-xs">s/d</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                title="Sampai tanggal"
                                className="w-full px-3 py-2 rounded-2xl border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                        >
                            <RotateCcw size={13} />
                            <span>Reset Filter</span>
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] shadow-sm transition-all"
                        >
                            <Filter size={13} />
                            <span>Terapkan</span>
                        </button>
                    </div>
                </form>

                {/* Table or Empty State */}
                {logs.data.length === 0 ? (
                    <EmptyState>Tidak ada entri log yang cocok dengan filter pencarian.</EmptyState>
                ) : (
                    <>
                        <ResponsiveTable
                            rows={rows}
                            columns={[
                                { key: 'waktu', label: 'Waktu' },
                                { key: 'pengguna', label: 'Pengguna / Staf' },
                                { key: 'aksi', label: 'Jenis Aksi' },
                                { key: 'entitas', label: 'Target Entitas' },
                                { key: 'detail', label: 'Rincian' },
                            ]}
                        />
                        <Pagination page={logs} />
                    </>
                )}
            </section>

            {/* Modal Detail & Diff Perubahan */}
            {selectedLog && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="audit-detail-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setSelectedLog(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[calc(100dvh-32px)] border border-stone-100 text-left my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 pb-4 shrink-0 flex items-start justify-between gap-4 border-b border-stone-100">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 id="audit-detail-title" className="text-xl font-bold text-stone-900 tracking-tight">
                                        Rincian Log #{selectedLog.id}
                                    </h2>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${formatActionLabel(selectedLog.action).bg} ${formatActionLabel(selectedLog.action).text} ${formatActionLabel(selectedLog.action).border}`}>
                                        {formatActionLabel(selectedLog.action).label}
                                    </span>
                                </div>
                                <p className="text-xs text-stone-500 mt-1">
                                    Tercatat pada {formatDateTime(selectedLog.created_at)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
                                aria-label="Tutup"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6 overflow-y-auto overscroll-contain flex-1">
                            {/* Metadata Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-100 text-xs">
                                <div>
                                    <span className="text-stone-400 block mb-0.5">Pengguna</span>
                                    <span className="font-semibold text-stone-800">
                                        {selectedLog.user ? selectedLog.user.name : 'Sistem Otomatis'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-stone-400 block mb-0.5">Email Pengguna</span>
                                    <span className="font-semibold text-stone-800">
                                        {selectedLog.user ? selectedLog.user.email : '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-stone-400 block mb-0.5">Target Entitas</span>
                                    <span className="font-semibold text-stone-800">
                                        {selectedLog.entity_type} (#{selectedLog.entity_id ?? '—'})
                                    </span>
                                </div>
                            </div>

                            {/* Diff View */}
                            {selectedLog.old_values && selectedLog.new_values ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                            Perubahan Data (Sebelum &amp; Sesudah)
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowRawPayload(!showRawPayload)}
                                            className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors underline cursor-pointer"
                                        >
                                            {showRawPayload ? 'Sembunyikan data mentah' : 'Lihat format teknis (JSON)'}
                                        </button>
                                    </div>

                                    {showRawPayload ? (
                                        <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto space-y-3">
                                            <div>
                                                <span className="text-stone-400 block mb-1 uppercase text-[10px]">Sebelum:</span>
                                                <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.old_values, null, 2)}</pre>
                                            </div>
                                            <div className="border-t border-stone-800 pt-3">
                                                <span className="text-stone-400 block mb-1 uppercase text-[10px]">Sesudah:</span>
                                                <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.new_values, null, 2)}</pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {filterDisplayEntries({ ...selectedLog.old_values, ...selectedLog.new_values }).map(([key]) => {
                                                const oldVal = selectedLog.old_values?.[key];
                                                const newVal = selectedLog.new_values?.[key];
                                                const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                                                return (
                                                    <div
                                                        key={key}
                                                        className={`p-3.5 rounded-2xl border text-xs sm:text-sm transition-all ${
                                                            isChanged ? 'bg-amber-50/40 border-amber-200' : 'bg-stone-50/50 border-stone-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="font-semibold text-stone-800">{formatFieldKey(key)}</span>
                                                            {isChanged && (
                                                                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                                                                    Diubah
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                            <div className="bg-white/90 p-2.5 rounded-xl border border-stone-200/60">
                                                                <span className="text-stone-400 block text-[10px] uppercase font-semibold mb-0.5">Semula:</span>
                                                                <div className="text-stone-700 font-medium">
                                                                    {formatHumanValue(key, oldVal)}
                                                                </div>
                                                            </div>
                                                            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/60">
                                                                <span className="text-emerald-700 block text-[10px] uppercase font-semibold mb-0.5">Menjadi:</span>
                                                                <div className="text-emerald-900 font-semibold">
                                                                    {formatHumanValue(key, newVal)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : selectedLog.new_values || selectedLog.old_values ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                            {selectedLog.new_values ? 'Rincian Data Aktivitas' : 'Rincian Data Sebelum Dihapus'}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowRawPayload(!showRawPayload)}
                                            className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors underline cursor-pointer"
                                        >
                                            {showRawPayload ? 'Sembunyikan data mentah' : 'Lihat format teknis (JSON)'}
                                        </button>
                                    </div>

                                    {showRawPayload ? (
                                        <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto">
                                            <pre className="whitespace-pre-wrap">
                                                {JSON.stringify(selectedLog.new_values ?? selectedLog.old_values, null, 2)}
                                            </pre>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs overflow-hidden divide-y divide-stone-100">
                                            {filterDisplayEntries((selectedLog.new_values ?? selectedLog.old_values) as Record<string, unknown>).map(([key, val]) => (
                                                <div
                                                    key={key}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 gap-1 sm:gap-4 hover:bg-stone-50/50 transition-colors"
                                                >
                                                    <span className="text-stone-500 text-xs sm:text-sm font-medium">
                                                        {formatFieldKey(key)}
                                                    </span>
                                                    <span className="text-stone-900 text-xs sm:text-sm font-medium sm:text-right">
                                                        {formatHumanValue(key, val)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-stone-400 italic">Tidak ada payload data tersimpan pada log ini.</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-6 pt-3 shrink-0 bg-stone-50/50 border-t border-stone-100 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="px-5 py-2.5 rounded-full text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 shadow-xs transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

AuditLog.layout = getAdminLayout;
