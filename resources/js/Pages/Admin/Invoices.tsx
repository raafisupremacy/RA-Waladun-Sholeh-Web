import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import Tile from '@/Components/Tile';
import BigNumber from '@/Components/BigNumber';
import StatusCapsule from '@/Components/StatusCapsule';
import ResponsiveTable from '@/Components/ResponsiveTable';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Pagination, { PageData } from '@/Components/Pagination';
import LoadingState from '@/Components/LoadingState';
import CustomSelect from '@/Components/CustomSelect';

type Invoice = { id:number; invoice_number:string; student:string; nis:string; classroom:string|null; month:number; year:number; amount:number; discount_amount:number; net_amount:number; due_date:string; status:string; overdue_days:number };
type Props = { invoices:PageData<Invoice>; academicYears:{id:number;name:string;is_active:boolean}[]; classrooms:{id:number;name:string;academic_year_id:number}[]; filters:Record<string,string|number|undefined>; currentPeriod:{month:number;year:number} };
const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const rupiah = (value:number) => `Rp ${value.toLocaleString('id-ID')}`;
const dateId = (value:string) => new Date(value).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
export default function Invoices({ invoices, academicYears, classrooms, filters, currentPeriod }: Props) {
    const page = usePage().props as { appName?: string; schoolSettings?: Record<string, string>; flash?: { success?: string } };
    const activeYear = academicYears.find(y => y.is_active) ?? academicYears[0];
    const [generateOpen, setGenerateOpen] = useState(false);
    const [preview, setPreview] = useState<{ created: number; skipped: number } | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState('');

    useEffect(() => {
        if (editingInvoice) {
            const orig = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = orig;
            };
        }
    }, [editingInvoice]);

    const handleSaveNominal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingInvoice) return;
        const num = parseInt(editAmount, 10);
        if (isNaN(num) || num < 0) {
            setEditError('Nominal harus berupa angka valid (minimal Rp 0).');
            return;
        }
        setEditSubmitting(true);
        setEditError('');
        router.patch(`/admin/tagihan/${editingInvoice.id}/nominal`, {
            net_amount: num,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingInvoice(null);
                setEditSubmitting(false);
            },
            onError: (errs) => {
                setEditSubmitting(false);
                const first = Object.values(errs)[0] as string;
                setEditError(first || 'Gagal mengubah nominal tagihan.');
            },
        });
    };

    const computeYearForMonth = (monthNum: number, ayId: string) => {
        const ay = academicYears.find(y => String(y.id) === String(ayId)) ?? activeYear;
        if (ay?.name) {
            const parts = ay.name.split('/');
            const start = parseInt(parts[0], 10);
            const end = parseInt(parts[1], 10) || (start + 1);
            return (monthNum >= 7 && monthNum <= 12) ? start : end;
        }
        return currentPeriod.year;
    };

    const initialMonth = String(filters.month ?? currentPeriod.month);
    const initialAyId = String(filters.academic_year_id ?? activeYear?.id ?? '');
    const initialYear = String(filters.year ?? computeYearForMonth(Number(initialMonth), initialAyId));

    const [form, setForm] = useState({
        month: initialMonth,
        year: initialYear,
        academic_year_id: initialAyId,
        amount: String(filters.amount ?? page.schoolSettings?.default_spp_amount ?? ''),
        due_date: String(filters.due_date ?? `${initialYear}-${initialMonth.padStart(2, '0')}-10`),
    });

    const change = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));

    const handleMonthChange = (val: string) => {
        const m = parseInt(val, 10);
        const yr = computeYearForMonth(m, form.academic_year_id);
        setForm(current => ({
            ...current,
            month: val,
            year: String(yr),
            due_date: `${yr}-${val.padStart(2, '0')}-10`,
        }));
    };

    const handleAcademicYearChange = (val: string) => {
        const m = parseInt(form.month, 10);
        const yr = computeYearForMonth(m, val);
        setForm(current => ({
            ...current,
            academic_year_id: val,
            year: String(yr),
            due_date: `${yr}-${form.month.padStart(2, '0')}-10`,
        }));
    };

    const apply = (event: React.FormEvent) => {
        event.preventDefault();
        router.get('/admin/tagihan', {
            ...filters,
            ...form,
            month: form.month,
            year: form.year,
            academic_year_id: form.academic_year_id,
        }, { preserveState: true, replace: true });
    };

    const getCsrfToken = () => {
        const meta = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (meta) return meta;
        const cookie = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return cookie ? decodeURIComponent(cookie[1]) : '';
    };

    const openGenerate = async () => {
        setPreviewing(true);
        setErrorMessage('');
        try {
            const csrf = getCsrfToken();
            const response = await fetch('/admin/tagihan/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-XSRF-TOKEN': csrf,
                },
                body: JSON.stringify(form),
            });

            if (response.ok) {
                const data = await response.json();
                setPreview(data);
                setGenerateOpen(true);
            } else {
                const errData = await response.json().catch(() => null);
                const msg = errData?.message || 'Gagal menghitung pratinjau tagihan. Silakan periksa kembali isian form.';
                setErrorMessage(msg);
                setPreview(null);
                setGenerateOpen(true);
            }
        } catch (err) {
            console.error('Error in openGenerate:', err);
            setPreview(null);
            setGenerateOpen(true);
        } finally {
            setPreviewing(false);
        }
    };

    const submitGenerate = () => {
        setSubmitting(true);
        router.post('/admin/tagihan/generate', form, {
            preserveScroll: true,
            onSuccess: () => {
                setGenerateOpen(false);
                setSubmitting(false);
            },
            onError: (errs) => {
                setSubmitting(false);
                const first = Object.values(errs)[0] as string;
                setErrorMessage(first || 'Terjadi kesalahan saat membuat tagihan.');
            },
        });
    };

    const rows = invoices.data.map(invoice => ({
        id: invoice.id,
        siswa: <div className="row-title">{invoice.student}<span>{invoice.nis}</span></div>,
        kelas: invoice.classroom ?? 'Belum ditempatkan',
        periode: `${months[invoice.month - 1]} ${invoice.year}`,
        nominal: <span className="money-value">{rupiah(invoice.net_amount)}</span>,
        jatuh_tempo: <span className="date-stack">{dateId(invoice.due_date)}{invoice.overdue_days > 0 && <small>terlambat {invoice.overdue_days} hari</small>}</span>,
        status: <StatusCapsule status={invoice.status} />,
        aksi: invoice.status === 'lunas' ? <span className="caption">Final</span> : (
            <button className="button-secondary" onClick={() => {
                setEditingInvoice(invoice);
                setEditAmount(String(invoice.net_amount));
                setEditError('');
            }}>Ubah nominal</button>
        ),
    }));

    const selectedMonthName = months[Number(form.month) - 1] ?? 'Bulan ini';

    return (
        <>
            <Head title="Tagihan SPP" />
            <header className="data-heading">
                <div>
                    <p className="eyebrow">Keuangan</p>
                    <h1>Tagihan SPP</h1>
                    <p>{invoices.total} data tagihan tercatat</p>
                </div>
            </header>

            {page.flash?.success && <p className="notice" role="status">{page.flash.success}</p>}
            {errorMessage && <p className="notice text-red-700 bg-red-50 border border-red-200" role="alert">{errorMessage}</p>}

            <Tile title="Generate tagihan bulanan" className="invoice-generator">
                <p>Buat tagihan SPP rutin untuk seluruh siswa aktif pada tahun ajaran terpilih.</p>
                <form onSubmit={apply}>
                    <div className="invoice-generator-grid">
                        <label className="form-field">
                            Bulan
                            <CustomSelect
                                className="w-full"
                                buttonClassName="h-12 rounded-[12px]"
                                value={form.month}
                                onChange={val => handleMonthChange(String(val))}
                                options={months.map((m, i) => ({ value: String(i + 1), label: m }))}
                            />
                        </label>
                        <label className="form-field">
                            Tahun ajaran
                            <CustomSelect
                                className="w-full"
                                buttonClassName="h-12 rounded-[12px]"
                                value={form.academic_year_id}
                                onChange={val => handleAcademicYearChange(String(val))}
                                options={academicYears.map(year => ({ value: String(year.id), label: year.name }))}
                            />
                        </label>
                        <label className="form-field">
                            Jatuh tempo
                            <input type="date" value={form.due_date} onChange={e => change('due_date', e.target.value)} />
                        </label>
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <button
                            className="button-primary"
                            type="button"
                            onClick={openGenerate}
                            disabled={previewing || submitting}
                        >
                            {previewing ? 'Menghitung…' : 'Generate untuk semua siswa aktif'}
                        </button>
                        <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200/80 rounded-full px-4 py-2 w-fit">
                            Tarif SPP otomatis: <strong className="text-stone-800 font-semibold">{rupiah(Number(form.amount || page.schoolSettings?.default_spp_amount || 350000))}</strong> / siswa
                        </div>
                    </div>
                </form>
            </Tile>

            <section className="data-panel invoice-list">
                <div className="filter-bar">
                    <form className="invoice-filters" onSubmit={apply}>
                        <label className="form-field">
                            Bulan
                            <CustomSelect
                                className="w-full"
                                buttonClassName="h-12 rounded-[12px]"
                                value={String(filters.month ?? '')}
                                onChange={val => change('month', String(val))}
                                options={[{ value: '', label: 'Semua bulan' }, ...months.map((m, i) => ({ value: String(i + 1), label: m }))]}
                            />
                        </label>
                        <label className="form-field">
                            Kelas
                            <CustomSelect
                                className="w-full"
                                buttonClassName="h-12 rounded-[12px]"
                                value={String(filters.classroom_id ?? '')}
                                onChange={val => router.get('/admin/tagihan', { ...filters, classroom_id: val }, { preserveState: true, replace: true })}
                                options={[{ value: '', label: 'Semua kelas' }, ...classrooms.map(c => ({ value: String(c.id), label: c.name }))]}
                            />
                        </label>
                        <label className="form-field">
                            Status
                            <CustomSelect
                                className="w-full"
                                buttonClassName="h-12 rounded-[12px]"
                                value={String(filters.status ?? '')}
                                onChange={val => router.get('/admin/tagihan', { ...filters, status: val }, { preserveState: true, replace: true })}
                                options={[
                                    { value: '', label: 'Semua status' },
                                    { value: 'lunas', label: 'Lunas' },
                                    { value: 'menunggu_verifikasi', label: 'Menunggu verifikasi' },
                                    { value: 'belum_bayar', label: 'Belum bayar' },
                                    { value: 'ditolak', label: 'Ditolak' },
                                ]}
                            />
                        </label>
                        <button className="button-secondary">Terapkan</button>
                    </form>
                </div>
                <ResponsiveTable
                    rows={rows}
                    columns={[
                        { key: 'siswa', label: 'Siswa' },
                        { key: 'kelas', label: 'Kelas' },
                        { key: 'periode', label: 'Bulan' },
                        { key: 'nominal', label: 'Nominal' },
                        { key: 'jatuh_tempo', label: 'Jatuh tempo' },
                        { key: 'status', label: 'Status' },
                        { key: 'aksi', label: 'Aksi' },
                    ]}
                />
                <Pagination page={invoices} />
            </section>

            <ConfirmDialog
                open={generateOpen}
                title={preview ? `${preview.created} tagihan akan dibuat` : `Generate tagihan ${selectedMonthName} ${form.year}?`}
                description={
                    preview
                        ? `Tagihan ${selectedMonthName} ${form.year} (${rupiah(Number(form.amount || page.schoolSettings?.default_spp_amount || 350000))}/siswa). ${preview.skipped} siswa dilewati karena sudah memiliki tagihan periode ini.`
                        : `Tagihan SPP ${selectedMonthName} ${form.year} (${rupiah(Number(form.amount || page.schoolSettings?.default_spp_amount || 350000))}/siswa) akan dibuat untuk seluruh siswa aktif pada tahun ajaran terpilih.`
                }
                confirmLabel="Generate"
                busy={submitting}
                onCancel={() => setGenerateOpen(false)}
                onConfirm={submitGenerate}
            />

            {/* Modal Ubah Nominal Tagihan */}
            {editingInvoice && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-nominal-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !editSubmitting) {
                            setEditingInvoice(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl flex flex-col max-h-[calc(100dvh-32px)] border border-stone-100 text-left my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 pb-4 shrink-0 flex items-start justify-between gap-4 border-b border-stone-100">
                            <div>
                                <h2 id="edit-nominal-title" className="text-xl font-bold text-stone-900 tracking-tight">
                                    Ubah Nominal Tagihan
                                </h2>
                                <p className="text-xs text-stone-500 mt-1">
                                    Penyesuaian tagihan SPP khusus (mis. beasiswa atau potongan saudara).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!editSubmitting) {
                                        setEditingInvoice(null);
                                    }
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
                                aria-label="Tutup"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSaveNominal} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 space-y-4 overflow-y-auto overscroll-contain flex-1">
                                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-stone-500">No. Tagihan</span>
                                        <span className="font-semibold text-stone-800">{editingInvoice.invoice_number}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-stone-500">Siswa</span>
                                        <span className="font-semibold text-stone-900">{editingInvoice.student} ({editingInvoice.nis})</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-stone-500">Periode</span>
                                        <span className="font-medium text-stone-700">{months[editingInvoice.month - 1]} {editingInvoice.year}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pt-1 border-t border-stone-200/60">
                                        <span className="text-stone-500">Nominal Awal</span>
                                        <span className="font-medium text-stone-700">{rupiah(editingInvoice.amount)}</span>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="input-net-amount" className="block text-xs font-semibold text-stone-700 mb-1.5">
                                        Nominal Tagihan Baru (Rp)
                                    </label>
                                    <input
                                        id="input-net-amount"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={editAmount}
                                        onChange={(e) => {
                                            setEditAmount(e.target.value);
                                            setEditError('');
                                        }}
                                        className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-stone-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:border-transparent transition-all"
                                        placeholder="0"
                                        required
                                        autoFocus
                                    />
                                    {editAmount && !isNaN(Number(editAmount)) && (
                                        <p className="text-xs text-stone-500 mt-1.5 font-medium">
                                            Terbaca: <span className="text-[#0071E3] font-semibold">{rupiah(Number(editAmount))}</span>
                                        </p>
                                    )}
                                    {editError && (
                                        <p className="text-xs text-rose-600 mt-1.5 font-medium">{editError}</p>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 sm:p-6 pt-3 shrink-0 bg-stone-50/50 border-t border-stone-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingInvoice(null)}
                                    disabled={editSubmitting}
                                    className="px-5 py-2.5 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2"
                                >
                                    {editSubmitting ? 'Menyimpan…' : 'Simpan Perubahan'}
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

Invoices.layout = getAdminLayout;

