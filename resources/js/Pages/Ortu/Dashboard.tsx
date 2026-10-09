import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Pin } from 'lucide-react';
import { getParentLayout } from '@/Layouts/ParentLayout';
import StatusCapsule from '@/Components/StatusCapsule';
import EmptyState from '@/Components/EmptyState';
import BottomSheet from '@/Components/BottomSheet';
import ProgressSteps from '@/Components/ProgressSteps';

type Student = { id: number; name: string; nis: string; classroom?: string | null };
type Invoice = { id: number; invoice_number: string; status: string; amount: number; discount_amount: number; net_amount?: number; due_date: string; paid_at?: string | null } | null;
type Journal = { id: number; journal_date: string; assessments: { aspect: string; level: string; note?: string | null }[] } | null;
type Announcement = { id: number; title: string; body: string; is_pinned: boolean; published_at: string };
const aspectLabels: Record<string, string> = { nilai_agama_moral: 'Nilai Agama dan Moral', fisik_motorik: 'Fisik Motorik', kognitif: 'Kognitif', bahasa: 'Bahasa', sosial_emosional: 'Sosial Emosional' };

export default function Dashboard({ students, activeStudentId, invoice, journal, announcements }: { students: Student[]; activeStudentId?: number | null; invoice: Invoice; journal: Journal; announcements: Announcement[] }) {
    const p = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };
    const [switching, setSwitching] = useState(false);
    const student = students.find(item => item.id === activeStudentId);
    const amount = invoice?.net_amount ?? (invoice ? invoice.amount - invoice.discount_amount : 0);
    const period = invoice?.invoice_number.match(/^INV-(\d{4})-(\d{2})-/);
    const periodLabel = period ? new Date(Number(period[1]), Number(period[2]) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '';
    const canUpload = invoice && ['belum_bayar', 'ditolak'].includes(invoice.status);
    const pinnedAnnouncements = announcements.filter(item => item.is_pinned);
    return <>
        <Head title="Beranda orang tua" />
        <section className="parent-hero">
            <div className="parent-hero-info">
                <div className="avatar-circle">
                    {student?.name.split(' ').map(part => part[0]).slice(0, 2).join('') ?? '—'}
                </div>
                <div>
                    <h1>{student?.name ?? 'Belum ada anak aktif'}</h1>
                    {student && (
                        <p>{student.classroom ?? 'Belum ada kelompok'} · NIS {student.nis}</p>
                    )}
                </div>
            </div>
            {student && students.length > 1 && (
                <button type="button" className="parent-switcher" onClick={() => setSwitching(true)}>
                    Ganti anak &gt;
                </button>
            )}
        </section>
        <BottomSheet open={switching} title="Ganti anak" onClose={() => setSwitching(false)}>
            <div className="child-options">
                {students.map(child => (
                    <Link
                        key={child.id}
                        href={`/ortu?student_id=${child.id}`}
                        aria-current={child.id === activeStudentId ? 'true' : undefined}
                        onClick={() => setSwitching(false)}
                    >
                        {child.name}<span>{child.classroom}</span>
                    </Link>
                ))}
            </div>
        </BottomSheet>
        {pinnedAnnouncements.length > 0 && (
            <div className="mb-6 space-y-3" aria-label="Pengumuman Disematkan">
                {pinnedAnnouncements.map((item) => (
                    <div
                        key={`pinned-${item.id}`}
                        className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 transition-all hover:bg-amber-50"
                    >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-900 shrink-0 mt-0.5">
                                <Pin size={11} className="rotate-45" />
                                <span>Disematkan</span>
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight leading-snug">
                                    {item.title}
                                </h2>
                                <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                                    {item.body}
                                </p>
                            </div>
                        </div>
                        <span className="text-xs text-stone-400 font-medium shrink-0 whitespace-nowrap self-start sm:self-center pl-8 sm:pl-0">
                            {new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                ))}
            </div>
        )}
        <section className="parent-dashboard-grid">
            <article className="parent-invoice-card"><p>SPP {periodLabel}</p>{invoice ? <><h2>Rp {amount.toLocaleString('id-ID')}</h2><div className="invoice-summary"><p>Jatuh tempo {new Date(invoice.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p><StatusCapsule status={invoice.status} /></div><ProgressSteps steps={['Diajukan', 'Verifikasi', 'Selesai']} current={invoice.status === 'lunas' ? 2 : invoice.status === 'menunggu_verifikasi' ? 1 : 0} /><div className="invoice-actions">{invoice.status === 'lunas' ? <a href={`/ortu/tagihan/${invoice.id}/kuitansi`} className="button-primary">Unduh bukti pembayaran</a> : <Link href={`/ortu/tagihan/${invoice.id}`} className="button-primary">{canUpload ? 'Unggah bukti bayar' : 'Lihat bukti bayar'}</Link>}<Link href={`/ortu/tagihan/${invoice.id}`} className="parent-detail-link">Lihat rincian tagihan &gt;</Link></div></> : <EmptyState>Belum ada tagihan terbaru.</EmptyState>}</article>
            <article className="parent-journal-card"><h2>Jurnal terakhir</h2>{journal ? <><p className="caption">{new Date(journal.journal_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</p>{Object.keys(aspectLabels).map(aspect => journal.assessments.find(item => item.aspect === aspect)).filter(item => item !== undefined).map(assessment => <div className="journal-summary-row" key={assessment.aspect}><strong>{aspectLabels[assessment.aspect]}</strong><StatusCapsule status={assessment.level} label={assessment.level.toUpperCase()} />{assessment.note && <p>{assessment.note}</p>}</div>)}<Link className="parent-detail-link" href="/ortu/perkembangan">Lihat semua riwayat jurnal &gt;</Link></> : <EmptyState>Belum ada jurnal final.</EmptyState>}</article>
        </section>
        <section className="parent-announcements"><div className="section-heading"><h2>Pengumuman</h2></div>{announcements.length ? <div className="announcement-feed">{announcements.map(item => <article key={item.id} className="announcement-feed-item"><div className="caption">{item.is_pinned && <span className="status status-nonaktif">Disematkan</span>} {new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div><h3>{item.title}</h3><p>{item.body}</p></article>)}</div> : <EmptyState>Belum ada pengumuman untuk kelompok anak ini.</EmptyState>}</section>
    </>;
}

Dashboard.layout = getParentLayout;

