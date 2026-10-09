import { Head, Link, usePage } from '@inertiajs/react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import BigNumber from '@/Components/BigNumber';
import ResponsiveTable from '@/Components/ResponsiveTable';
import StatusCapsule from '@/Components/StatusCapsule';

type AnnouncementItem = { id: number; title: string; date: string };
type Payment = {
    id: number;
    student: string;
    month?: number;
    year?: number;
    month_label?: string;
    amount: number;
    status: string;
    uploaded_at?: string;
    invoice_id?: number;
    action?: string;
};

type Metrics = {
    active_students: number;
    students_breakdown?: string;
    pending_payments: number;
    latest_pending_text?: string;
    unpaid_invoices: number;
    received_this_month: number;
    transactions_count?: number;
    active_announcements: number;
    announcements?: AnnouncementItem[];
};

export default function Dashboard({
    metrics,
    recent_payments = [],
}: {
    metrics: Metrics;
    recent_payments?: Payment[];
}) {
    const p = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    return (
        <>
            <Head title="Beranda admin" />
            <section className="admin-hero">
                <h1>
                    <strong>{metrics.pending_payments}</strong>
                    <span>pembayaran menunggu verifikasi</span>
                </h1>
                <div className="admin-hero-actions">
                    <p>{metrics.latest_pending_text || 'Periksa bukti pembayaran yang masuk.'}</p>
                    <Link className="button-primary" href="/admin/verifikasi">
                        Buka antrean verifikasi
                    </Link>
                </div>
            </section>

            <section className="admin-metrics">
                <article className="tile flex flex-col justify-between">
                    <div>
                        <h2>Siswa aktif</h2>
                        <BigNumber>{metrics.active_students}</BigNumber>
                    </div>
                    {metrics.students_breakdown && (
                        <p className="text-xs text-[var(--text-2)] mt-3 leading-relaxed">
                            {metrics.students_breakdown}
                        </p>
                    )}
                </article>

                <article className="tile money-tile flex flex-col justify-between">
                    <div>
                        <h2>Masuk bulan ini</h2>
                        <div className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-[var(--text-1)] mt-2">
                            Rp {metrics.received_this_month.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <p className="text-xs text-[var(--text-2)] mt-3">
                        {metrics.transactions_count ?? 0} transaksi
                    </p>
                </article>

                <article className="tile flex flex-col justify-between">
                    <div>
                        <h2>Belum bayar</h2>
                        <BigNumber>{metrics.unpaid_invoices}</BigNumber>
                    </div>
                    <div className="mt-3">
                        <Link className="text-sm font-semibold text-[var(--accent)] hover:underline" href="/admin/tagihan">
                            Lihat tagihan &gt;
                        </Link>
                    </div>
                </article>

                <article className="tile flex flex-col justify-between">
                    <div>
                        <h2>Pengumuman aktif</h2>
                        {metrics.announcements && metrics.announcements.length > 0 ? (
                            <div className="flex flex-col gap-2.5 mt-2">
                                {metrics.announcements.map((ann) => (
                                    <div key={ann.id} className="text-xs">
                                        <div className="font-semibold text-[var(--text-1)] line-clamp-1">{ann.title}</div>
                                        <div className="text-[var(--text-2)] mt-0.5">{ann.date}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <BigNumber>{metrics.active_announcements}</BigNumber>
                        )}
                    </div>
                    <div className="mt-3">
                        <Link className="text-sm font-semibold text-[var(--accent)] hover:underline" href="/admin/pengumuman">
                            Kelola pengumuman &gt;
                        </Link>
                    </div>
                </article>
            </section>

            <section className="admin-recent">
                <div className="section-heading flex items-center justify-between mb-4">
                    <h2>Pembayaran terbaru</h2>
                    <Link className="text-sm font-semibold text-[var(--accent)] hover:underline" href="/admin/verifikasi">
                        Lihat riwayat lengkap &gt;
                    </Link>
                </div>
                <ResponsiveTable
                    rows={recent_payments}
                    columns={[
                        {
                            key: 'student',
                            label: 'Siswa',
                            render: (_, row) => (
                                <span className="font-medium text-[var(--text-1)]">
                                    {row.student ?? '—'}
                                </span>
                            ),
                        },
                        {
                            key: 'month',
                            label: 'Bulan',
                            render: (_, row) => (
                                <span className="text-[var(--text-2)]">
                                    {row.month_label ?? (row.month && row.year ? new Date(row.year, row.month - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '—')}
                                </span>
                            ),
                        },
                        {
                            key: 'amount',
                            label: 'Nominal',
                            render: (_, row) => (
                                <span className="font-semibold text-[var(--text-1)]">
                                    Rp {row.amount.toLocaleString('id-ID')}
                                </span>
                            ),
                        },
                        {
                            key: 'uploaded_at',
                            label: 'Diunggah',
                            render: (_, row) => (
                                <span className="text-xs text-[var(--text-2)]">
                                    {row.uploaded_at ?? '—'}
                                </span>
                            ),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (_, row) => {
                                const status = row.status === 'menunggu' ? 'menunggu_verifikasi' : row.status === 'disetujui' ? 'lunas' : row.status;
                                return <StatusCapsule status={status} />;
                            },
                        },
                        {
                            key: 'action',
                            label: 'Aksi',
                            render: (_, row) => (
                                <Link
                                    className="text-sm font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                                    href={row.status === 'menunggu' ? '/admin/verifikasi' : '/admin/tagihan'}
                                >
                                    {row.status === 'menunggu' ? 'Periksa >' : 'Detail >'}
                                </Link>
                            ),
                        },
                    ]}
                />
            </section>
        </>
    );
}

Dashboard.layout = getAdminLayout;


