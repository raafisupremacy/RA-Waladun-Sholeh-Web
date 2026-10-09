import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Maximize2, X } from 'lucide-react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import ProgressSteps from '@/Components/ProgressSteps';
import EmptyState from '@/Components/EmptyState';
import Pagination, { PageData } from '@/Components/Pagination';

type QueuePayment = {
    id: number;
    student: string;
    month: number;
    year: number;
    invoice_amount: number;
    submitted_at: string;
};

type Detail = QueuePayment & {
    invoice_number: string;
    nis: string;
    classroom?: string;
    guardian: string;
    amount_transferred: number;
    transfer_date: string;
    sender_name: string;
    note?: string;
    proof_url: string;
    proof_type: string;
    has_proof?: boolean;
};

const monthName = (month: number) =>
    new Date(2000, month - 1, 1).toLocaleDateString('id-ID', { month: 'long' });

const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export default function PaymentVerification({
    payments,
    selected,
    detailOpen,
}: {
    payments: PageData<QueuePayment>;
    selected: Detail | null;
    detailOpen: boolean;
}) {
    const p = usePage().props as {
        appName?: string;
        schoolSettings?: Record<string, string>;
        flash?: { success?: string };
    };

    const [rejectOpen, setRejectOpen] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const rejection = useForm({ rejection_reason: '' });

    useEffect(() => {
        if (!lightboxOpen && !rejectOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLightboxOpen(false);
                setRejectOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [lightboxOpen, rejectOpen]);

    const review = (action: 'setujui' | 'tolak') => {
        if (!selected) return;
        if (action === 'setujui') {
            router.post(`/admin/verifikasi/${selected.id}/setujui`, {}, { preserveScroll: true });
        } else {
            setRejectOpen(true);
        }
    };

    const submitReject = () => {
        if (!selected) return;
        rejection.post(`/admin/verifikasi/${selected.id}/tolak`, {
            onSuccess: () => setRejectOpen(false),
        });
    };

    return (
        <>
            <Head title="Verifikasi pembayaran" />
            <header className="data-heading payment-heading">
                <div>
                    <p className="eyebrow">Keuangan</p>
                    <h1>Verifikasi pembayaran</h1>
                    <p>{payments.total} pembayaran menunggu</p>
                </div>
            </header>

            {p.flash?.success && <p className="notice" role="status">{p.flash.success}</p>}

            <div className="verification-layout">
                <section className="payment-queue">
                    <div className="queue-heading">
                        <h2>Antrean pembayaran</h2>
                        <span>{payments.total} menunggu</span>
                    </div>
                    {payments.data.length === 0 ? (
                        <EmptyState>Tidak ada pembayaran yang menunggu.</EmptyState>
                    ) : (
                        <>
                            {payments.data.map((payment) => (
                                <Link
                                    key={payment.id}
                                    href={`/admin/verifikasi?payment=${payment.id}`}
                                    className={`payment-queue-row ${selected?.id === payment.id ? 'is-selected' : ''}`}
                                >
                                    <div className="payment-queue-row-header">
                                        <strong>{payment.student}</strong>
                                        <small>{payment.submitted_at}</small>
                                    </div>
                                    <span>
                                        {monthName(payment.month)} {payment.year} · {rupiah(payment.invoice_amount)}
                                    </span>
                                </Link>
                            ))}
                            <Pagination page={payments} />
                        </>
                    )}
                </section>

                {selected ? (
                    <section className="payment-detail">
                        <div className="payment-detail-header">
                            <div>
                                <h2>{selected.student}</h2>
                                <p>NIS {selected.nis} · {selected.classroom ?? 'Belum ada kelas'}</p>
                            </div>
                            <StatusCapsule status="menunggu_verifikasi" />
                        </div>

                        <div className="payment-detail-grid">
                            <div>
                                <h3>Bukti bayar</h3>
                                <div className="proof-preview">
                                    {selected.proof_type === 'image' ? (
                                        <img
                                            src={selected.proof_url}
                                            alt="Bukti transfer"
                                            className="rounded-xl border border-[var(--separator)] max-h-72 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setLightboxOpen(true)}
                                        />
                                    ) : (
                                        <iframe
                                            src={selected.proof_url}
                                            title="Bukti transfer PDF"
                                            className="w-full h-72 rounded-xl border border-[var(--separator)]"
                                        />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLightboxOpen(true)}
                                    className="parent-detail-link cursor-pointer bg-transparent border-0 p-0 text-[var(--accent)] text-sm font-semibold mt-2 inline-flex items-center gap-1.5 hover:underline"
                                >
                                    <span>Buka ukuran penuh</span>
                                    <Maximize2 size={13} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="payment-facts">
                                <h3>Rincian transaksi</h3>
                                <dl>
                                    <div>
                                        <dt>Orang tua</dt>
                                        <dd>{selected.guardian}</dd>
                                    </div>
                                    <div>
                                        <dt>Tagihan</dt>
                                        <dd>{selected.invoice_number}</dd>
                                    </div>
                                    <div>
                                        <dt>Nominal tagihan</dt>
                                        <dd>{rupiah(selected.invoice_amount)}</dd>
                                    </div>
                                    <div>
                                        <dt>Nominal transfer</dt>
                                        <dd>
                                            {rupiah(selected.amount_transferred)}{' '}
                                            <StatusCapsule
                                                status={selected.amount_transferred === selected.invoice_amount ? 'lunas' : 'ditolak'}
                                                label={selected.amount_transferred === selected.invoice_amount ? 'Sesuai' : `Selisih ${rupiah(Math.abs(selected.amount_transferred - selected.invoice_amount))}`}
                                            />
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Tanggal transfer</dt>
                                        <dd>
                                            {new Date(selected.transfer_date).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Nama pengirim</dt>
                                        <dd>{selected.sender_name}</dd>
                                    </div>
                                    {selected.note && (
                                        <div>
                                            <dt>Catatan</dt>
                                            <dd>{selected.note}</dd>
                                        </div>
                                    )}
                                </dl>

                                <ProgressSteps steps={['Belum bayar', 'Menunggu verifikasi', 'Lunas']} current={1} />

                                <div className="payment-actions">
                                    <button className="button-primary" onClick={() => review('setujui')}>
                                        Setujui (tandai lunas)
                                    </button>
                                    <button className="button-danger" onClick={() => review('tolak')}>
                                        Tolak
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="payment-detail empty-detail">
                        <EmptyState>Pilih pembayaran dari antrean.</EmptyState>
                    </section>
                )}
            </div>

            {/* Modal Tolak Pembayaran */}
            {rejectOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reject-payment-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !rejection.processing) {
                            setRejectOpen(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl flex flex-col max-h-[calc(100dvh-32px)] border border-stone-100 text-left my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 pb-4 shrink-0 flex items-start justify-between gap-4 border-b border-stone-100">
                            <div>
                                <h2 id="reject-payment-title" className="text-xl font-bold text-stone-900 tracking-tight">
                                    Tolak Pembayaran
                                </h2>
                                <p className="text-xs text-stone-500 mt-1">
                                    Alasan penolakan wajib diisi agar orang tua dapat memperbaiki bukti.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!rejection.processing) setRejectOpen(false);
                                }}
                                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                                aria-label="Tutup"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
                            <div>
                                <label htmlFor="rejection-reason-input" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    Alasan Penolakan
                                </label>
                                <textarea
                                    id="rejection-reason-input"
                                    aria-label="Alasan penolakan"
                                    value={rejection.data.rejection_reason}
                                    onChange={(e) => rejection.setData('rejection_reason', e.target.value)}
                                    placeholder="Tulis alasan penolakan secara spesifik..."
                                    rows={3}
                                    className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all text-stone-900 resize-none"
                                />
                                {rejection.errors.rejection_reason && (
                                    <p className="mt-1.5 text-xs text-rose-600 font-medium">
                                        {rejection.errors.rejection_reason}
                                    </p>
                                )}
                            </div>

                            <div>
                                <p className="text-xs text-stone-500 mb-2 font-medium">Pilih cepat alasan:</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Nominal tidak sesuai', 'Bukti tidak terbaca', 'Bukan bukti transfer SPP'].map((reason) => (
                                        <button
                                            type="button"
                                            key={reason}
                                            onClick={() => rejection.setData('rejection_reason', reason)}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-4 px-6 border-t border-stone-100 bg-stone-50/60 shrink-0 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                disabled={rejection.processing}
                                onClick={() => setRejectOpen(false)}
                                className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-white transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={rejection.processing}
                                onClick={submitReject}
                                className="px-6 py-2.5 rounded-full bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
                            >
                                {rejection.processing ? 'Memproses…' : 'Tolak pembayaran'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* In-page Lightbox Dialog for Admin Proof Preview */}
            {lightboxOpen && selected && typeof document !== 'undefined' && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Bukti Transfer Penuh"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-hidden"
                    onClick={() => setLightboxOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-2xl w-full max-h-[calc(100dvh-32px)] flex flex-col items-center overflow-hidden shadow-2xl border border-stone-100 animate-in fade-in zoom-in-95 duration-150 my-auto text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full flex items-center justify-between p-5 pb-3 border-b border-[var(--separator)] shrink-0">
                            <div>
                                <h3 className="font-semibold text-base text-[var(--text)]">
                                    Bukti Transfer · {selected.student}
                                </h3>
                                <p className="text-xs text-[var(--text-2)] mt-0.5">
                                    {selected.invoice_number} · Nominal {rupiah(selected.amount_transferred)}
                                </p>
                            </div>
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
                            {selected.proof_type === 'pdf' ? (
                                <iframe
                                    src={selected.proof_url}
                                    title="Bukti transfer"
                                    className="w-full h-[520px] rounded-lg border border-[var(--separator)]"
                                />
                            ) : (
                                <img
                                    src={selected.proof_url}
                                    alt="Bukti transfer penuh"
                                    className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-xs"
                                />
                            )}
                        </div>
                        <div className="w-full p-4 border-t border-[var(--separator)] bg-stone-50/60 shrink-0 flex items-center justify-between">
                            <a
                                href={selected.proof_url}
                                target="_blank"
                                rel="noreferrer"
                                className="button-secondary text-xs px-4 py-2 rounded-full inline-flex items-center gap-1.5"
                            >
                                <span>Buka di tab baru</span>
                                <ExternalLink size={13} strokeWidth={2} />
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

PaymentVerification.layout = getAdminLayout;

