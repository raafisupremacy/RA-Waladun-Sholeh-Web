import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Download, X } from 'lucide-react';
import { getParentLayout } from '@/Layouts/ParentLayout';
import ProgressSteps from '@/Components/ProgressSteps';
import StatusCapsule from '@/Components/StatusCapsule';

type Student = { id: number; name: string; nis: string; classroom?: string | null };
type Payment = { status: string; proof_type?: string; reviewed_at?: string | null; submitted_at?: string | null; transfer_date?: string | null; rejection_reason?: string | null; proof_url?: string | null };
type Invoice = { id: number; invoice_number: string; status: string; amount: number; discount_amount: number; net_amount: number; due_date: string; paid_at?: string | null; verified_at?: string | null; period_month: number; period_year: number; student?: Student | null; latest_payment?: Payment | null; cash_ledger_entry?: { receipt_number: string; entry_date: string; amount_in: number } | null; verifier_name?: string | null };
type Props = { invoice: Invoice };
const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const money = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;
const date = (value?: string | null, withTime = false) => value ? new Date(value).toLocaleDateString('id-ID', withTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function InvoiceDetail({ invoice }: Props) {
    const p = usePage().props as { appName?: string; schoolSettings?: Record<string, string>; flash?: { success?: string } };
    const form = useForm<{ proof: File | null; note: string }>({ proof: null, note: '' });
    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);
    const [clientError, setClientError] = useState('');
    const [preview, setPreview] = useState('');
    const [copyMessage, setCopyMessage] = useState('');
    const [lightboxOpen, setLightboxOpen] = useState(false);

    useEffect(() => {
        if (!form.data.proof) { setPreview(''); return; }
        const url = URL.createObjectURL(form.data.proof);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [form.data.proof]);

    const copyAccount = async () => {
        try {
            await navigator.clipboard.writeText(p.schoolSettings?.bank_account_number ?? '');
            setCopyMessage('Nomor rekening disalin.');
        } catch {
            setCopyMessage('Tidak dapat menyalin. Silakan salin nomor rekening secara manual.');
        }
    };

    const isUploadable = invoice.status === 'belum_bayar' || invoice.status === 'ditolak';
    const payment = invoice.latest_payment;
    const current = invoice.status === 'lunas' ? 2 : invoice.status === 'menunggu_verifikasi' || invoice.status === 'ditolak' ? 1 : 0;

    useEffect(() => {
        if (!lightboxOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [lightboxOpen]);

    const pickFile = (file?: File) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
            form.setData('proof', null);
            return setClientError('Pilih file JPG, PNG, atau PDF.');
        }
        if (file.size > 5 * 1024 * 1024) {
            form.setData('proof', null);
            return setClientError('Ukuran file maksimal 5 MB.');
        }
        setClientError('');
        form.setData('proof', file);
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.data.proof) return setClientError('Bukti pembayaran wajib dipilih.');
        form.post(`/ortu/tagihan/${invoice.id}/bukti`, { forceFormData: true, preserveScroll: true });
    };

    const uploadTile = (
        <div className="parent-upload-tile">
            <h2>{invoice.status === 'ditolak' ? 'Unggah ulang bukti transfer' : 'Transfer ke'}</h2>
            <div className="bank-details">
                <strong>{p.schoolSettings?.bank_name ?? '—'} {p.schoolSettings?.bank_account_number ?? '—'}</strong>
                <span>a.n. {p.schoolSettings?.bank_account_holder ?? '—'}</span>
                <button type="button" className="parent-copy-button" onClick={copyAccount}>Salin nomor rekening</button>
                <span role="status">{copyMessage}</span>
            </div>
            <form onSubmit={submit} className="parent-proof-form">
                <h3>{invoice.status === 'ditolak' ? 'Pilih bukti baru' : 'Unggah bukti transfer'}</h3>
                <div className="proof-dropzone">
                    {form.data.proof ? (
                        <div className="proof-file">
                            {form.data.proof.type === 'application/pdf' ? 'PDF' : <img src={preview} alt="Pratinjau bukti pembayaran" />}
                            <span>{form.data.proof.name}</span>
                            <button type="button" onClick={() => form.setData('proof', null)}>Ganti file</button>
                        </div>
                    ) : (
                        <>
                            <span>Pilih foto bukti transfer</span>
                            <div>
                                <button type="button" className="button-secondary" onClick={() => cameraRef.current?.click()}>Kamera</button>
                                <button type="button" className="button-secondary" onClick={() => galleryRef.current?.click()}>Galeri</button>
                            </div>
                        </>
                    )}
                    <input ref={cameraRef} type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" hidden onChange={event => pickFile(event.target.files?.[0])} />
                    <input ref={galleryRef} type="file" accept="image/jpeg,image/png,application/pdf" hidden onChange={event => pickFile(event.target.files?.[0])} />
                </div>
                <label className="form-field">
                    Catatan (opsional)
                    <textarea value={form.data.note} onChange={event => form.setData('note', event.target.value)} placeholder="Misal: transfer dari rekening Ayah" />
                </label>
                {(clientError || form.errors.proof) && <p className="field-error" role="alert">{clientError || form.errors.proof}</p>}
                {Object.entries(form.errors).filter(([key]) => key !== 'proof').map(([key, error]) => <p key={key} className="field-error" role="alert">{error}</p>)}
                <p className="caption">JPG, PNG, atau PDF · Maksimal 5 MB</p>
                <button type="submit" className="button-primary" disabled={form.processing}>
                    {form.processing ? 'Mengirim…' : invoice.status === 'ditolak' ? 'Unggah ulang' : 'Kirim bukti'}
                </button>
                <p className="caption">Verifikasi biasanya selesai dalam 1–2 hari kerja.</p>
            </form>
        </div>
    );

    const detailTile = (
        <aside className="parent-invoice-detail-tile">
            <h2>Rincian tagihan</h2>
            <dl>
                <div><dt>Tagihan</dt><dd>SPP {months[invoice.period_month - 1]} {invoice.period_year}</dd></div>
                <div><dt>Siswa</dt><dd>{invoice.student?.name} · {invoice.student?.classroom ?? 'Belum ada kelompok'}</dd></div>
                <div><dt>Nominal</dt><dd>{money(invoice.net_amount)}</dd></div>
                <div><dt>Jatuh tempo</dt><dd>{date(invoice.due_date)}</dd></div>
                {invoice.status === 'lunas' && <div><dt>Dibayar</dt><dd>{date(invoice.paid_at)}</dd></div>}
                <div><dt>No. tagihan</dt><dd className="invoice-number">{invoice.invoice_number}</dd></div>
            </dl>
        </aside>
    );

    return (
        <>
            <Head title={`SPP ${months[invoice.period_month - 1]} ${invoice.period_year}`} />
            <section className="parent-invoice-detail-hero">
                <Link className="parent-back-link inline-flex items-center gap-1" href="/ortu/tagihan">
                    <ChevronLeft size={20} strokeWidth={2.5} className="-ml-1" />
                    <span>Tagihan</span>
                </Link>
                <h1>SPP {months[invoice.period_month - 1]} {invoice.period_year}</h1>
                <div className="parent-invoice-amount">
                    <strong>{money(invoice.net_amount)}</strong>
                    <StatusCapsule status={invoice.status} />
                </div>
                <p>Jatuh tempo {date(invoice.due_date)}</p>
                <ProgressSteps steps={['Diajukan', 'Verifikasi', 'Selesai']} current={current} />
                <div className="invoice-step-times">
                    <span>{payment?.submitted_at ? date(payment.submitted_at, true) : ''}</span>
                    <span>{payment?.reviewed_at ? date(payment.reviewed_at, true) : ''}</span>
                    <span>{invoice.status === 'lunas' ? date(invoice.verified_at, true) : ''}</span>
                </div>
            </section>

            <section className="parent-invoice-detail-grid">
                <div className="parent-invoice-action-tile">
                    {invoice.status === 'belum_bayar' && uploadTile}
                    {invoice.status === 'ditolak' && (
                        <>
                            <div className="invoice-alert invoice-alert-danger">
                                <strong>Ditolak</strong>
                                <span>{payment?.rejection_reason ?? 'Bukti pembayaran ditolak.'}</span>
                                <small>Silakan unggah ulang bukti pembayaran.</small>
                            </div>
                            {uploadTile}
                        </>
                    )}
                    {invoice.status === 'menunggu_verifikasi' && (
                        <>
                            <div className="invoice-alert invoice-alert-warning">
                                Bukti sudah diterima {date(payment?.submitted_at, true)}. Sedang diperiksa sekolah.
                            </div>
                            <h2>Bukti transfer yang diunggah</h2>
                            {payment?.proof_url && (
                                <button
                                    type="button"
                                    className="proof-thumbnail text-left cursor-pointer w-full bg-transparent border-0 p-0"
                                    onClick={() => setLightboxOpen(true)}
                                >
                                    {payment.proof_type === 'image' && (
                                        <img src={payment.proof_url + '?preview=1'} alt="Bukti transfer yang diunggah" className="rounded-xl border border-[var(--separator)] max-h-48 w-auto object-cover" />
                                    )}
                                    <span className="text-[var(--accent)] font-semibold mt-2 inline-flex items-center gap-1">
                                        Lihat bukti penuh &gt;
                                    </span>
                                </button>
                            )}
                        </>
                    )}
                    {invoice.status === 'lunas' && (
                        <>
                            <div className="invoice-alert invoice-alert-success">
                                <strong>Lunas</strong>
                                <span>dibayar {date(invoice.paid_at)}.</span>
                                {invoice.verifier_name && <small>Diverifikasi oleh {invoice.verifier_name}.</small>}
                            </div>
                            <dl className="payment-summary">
                                <div><dt>Metode pembayaran</dt><dd>Transfer bank</dd></div>
                                <div><dt>Waktu pembayaran</dt><dd>{date(invoice.paid_at, true)} WIB</dd></div>
                                <div><dt>Diverifikasi oleh</dt><dd>{invoice.verifier_name ?? 'Tata Usaha'}</dd></div>
                                <div><dt>No. kuitansi</dt><dd>{invoice.cash_ledger_entry?.receipt_number ?? '—'}</dd></div>
                            </dl>
                            <a className="button-primary" href={`/ortu/tagihan/${invoice.id}/kuitansi`}>Unduh bukti pembayaran</a>
                        </>
                    )}
                </div>
                {detailTile}
            </section>

            {p.flash?.success && <p className="notice" role="status">{p.flash.success}</p>}

            {/* In-page Lightbox Dialog for viewing proof without downloading */}
            {lightboxOpen && payment?.proof_url && typeof document !== 'undefined' && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Pratinjau Bukti Transfer"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-hidden"
                    onClick={() => setLightboxOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-2xl w-full max-h-[calc(100dvh-32px)] flex flex-col items-center overflow-hidden shadow-2xl border border-stone-100 animate-in fade-in zoom-in-95 duration-150 my-auto text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full flex items-center justify-between p-5 pb-3 border-b border-[var(--separator)] shrink-0">
                            <span className="font-semibold text-sm text-[var(--text)]">
                                Bukti Transfer yang Diunggah
                            </span>
                            <button
                                type="button"
                                onClick={() => setLightboxOpen(false)}
                                className="p-1 rounded-full text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[#F5F5F7] transition-colors"
                                aria-label="Tutup pratinjau"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="w-full flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
                            {payment.proof_type === 'pdf' ? (
                                <iframe src={`${payment.proof_url}?preview=1`} title="Bukti transfer" className="w-full h-[500px] rounded-lg border border-[var(--separator)]" />
                            ) : (
                                <img
                                    src={`${payment.proof_url}?preview=1`}
                                    alt="Bukti transfer penuh"
                                    className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-xs"
                                />
                            )}
                        </div>
                        <div className="w-full p-4 border-t border-[var(--separator)] bg-stone-50/60 shrink-0 flex items-center justify-between">
                            <a
                                href={`${payment.proof_url}?download=1`}
                                className="button-secondary text-xs px-4 py-2 rounded-full inline-flex items-center gap-1.5"
                            >
                                <Download size={13} />
                                <span>Unduh berkas</span>
                            </a>
                            <button
                                type="button"
                                onClick={() => setLightboxOpen(false)}
                                className="button-primary text-xs px-5 py-2 rounded-full font-medium"
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

InvoiceDetail.layout = getParentLayout;

