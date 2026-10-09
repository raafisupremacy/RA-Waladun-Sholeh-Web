import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import { ArrowLeft, ChevronRight, Pin } from 'lucide-react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import SegmentedControl from '@/Components/SegmentedControl';

type Classroom = { id: number; name: string };

type Announcement = {
    id: number;
    title: string;
    body: string;
    status: string;
    is_pinned: boolean;
    classroom_id?: number | null;
    classroom_name?: string | null;
    expires_at?: string | null;
} | null;

export default function Form({
    announcement,
    classrooms,
}: {
    announcement: Announcement;
    classrooms: Classroom[];
}) {
    const editing = !!announcement;

    const form = useForm({
        title: announcement?.title ?? '',
        body: announcement?.body ?? '',
        target: announcement?.classroom_id ? 'classroom' : 'all',
        classroom_id: announcement?.classroom_id ? String(announcement.classroom_id) : '',
        is_pinned: announcement?.is_pinned ?? false,
        status: announcement?.status ?? 'draf',
        expires_at: announcement?.expires_at ? announcement.expires_at.replace(' ', 'T').slice(0, 16) : '',
    });

    const targetOptions = ['Semua', ...classrooms.map(c => c.name)];
    const currentTargetValue =
        form.data.target === 'all'
            ? 'Semua'
            : classrooms.find(c => String(c.id) === form.data.classroom_id)?.name ?? 'Semua';

    const selectedClassroomName = classrooms.find(
        c => String(c.id) === form.data.classroom_id
    )?.name;

    const previewBody = useMemo(() => {
        return form.data.body.trim() || 'Isi pengumuman akan tampil di sini.';
    }, [form.data.body]);

    const formattedToday = useMemo(() => {
        return new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }, []);

    const submit = (statusValue: 'draf' | 'terbit') => {
        const url = editing ? `/admin/pengumuman/${announcement?.id}` : '/admin/pengumuman';

        form.transform(data => ({
            ...data,
            status: statusValue,
            classroom_id: data.target === 'classroom' ? (data.classroom_id ? Number(data.classroom_id) : null) : null,
            expires_at: data.expires_at ? data.expires_at : null,
        }));

        if (editing) {
            form.put(url, { preserveScroll: true });
        } else {
            form.post(url, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title={editing ? 'Ubah Pengumuman' : 'Buat Pengumuman'} />

            {/* Back Link and Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200/80">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                    <Link
                        href="/admin/pengumuman"
                        className="font-semibold text-stone-700 hover:text-stone-900 transition-colors inline-flex items-center gap-1.5"
                    >
                        <ArrowLeft size={14} strokeWidth={2} />
                        <span>Pengumuman</span>
                    </Link>
                    <span>/</span>
                    <span className="text-stone-400">{editing ? 'Ubah' : 'Buat Baru'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Draf Sinkron</span>
                </div>
            </div>

            {/* Form & Live Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-28">
                {/* Form Column (Left) */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
                            {editing ? 'Ubah Pengumuman' : 'Form Pengumuman Baru'}
                        </h1>
                        <p className="text-stone-500 mt-1 text-sm leading-relaxed">
                            Publikasikan informasi resmi, agenda luar kelas, atau pemberitahuan penting ke wali murid.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="title" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                            Judul Pengumuman
                        </label>
                        <input
                            id="title"
                            type="text"
                            required
                            value={form.data.title}
                            onChange={e => form.setData('title', e.target.value)}
                            placeholder="Contoh: Jadwal Kunjungan Edukasi ke Kebun Raya"
                            className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                        />
                        {form.errors.title && (
                            <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.title}</p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="body" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                                Isi Pengumuman
                            </label>
                            <span className="text-xs text-stone-400 font-mono">
                                {form.data.body.length} karakter
                            </span>
                        </div>
                        <textarea
                            id="body"
                            required
                            rows={8}
                            value={form.data.body}
                            onChange={e => form.setData('body', e.target.value)}
                            placeholder="Tuliskan isi pengumuman lengkap di sini..."
                            className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900 resize-none leading-relaxed"
                        />
                        {form.errors.body && (
                            <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.body}</p>
                        )}
                    </div>

                    <div>
                        <span className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                            Sasaran Pengumuman
                        </span>
                        <SegmentedControl
                            options={targetOptions}
                            value={currentTargetValue}
                            onChange={val => {
                                if (val === 'Semua') {
                                    form.setData({ ...form.data, target: 'all', classroom_id: '' });
                                } else {
                                    const match = classrooms.find(c => c.name === val);
                                    if (match) {
                                        form.setData({ ...form.data, target: 'classroom', classroom_id: String(match.id) });
                                    }
                                }
                            }}
                        />
                        {form.errors.classroom_id && (
                            <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.classroom_id}</p>
                        )}
                    </div>

                    {/* Pin Checkbox Card */}
                    <label className="flex items-start gap-3 p-4 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition-colors cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.data.is_pinned}
                            onChange={e => form.setData('is_pinned', e.target.checked)}
                            className="w-5 h-5 mt-0.5 rounded text-[#0071E3] focus:ring-[#0071E3] border-stone-300"
                        />
                        <div>
                            <span className="block text-sm font-semibold text-stone-900">
                                Sematkan pengumuman di bagian teratas beranda orang tua
                            </span>
                            <span className="block text-xs text-stone-500 mt-0.5">
                                Pengumuman bertanda sematan selalu muncul di puncak umpan linimasa.
                            </span>
                        </div>
                    </label>

                    <div>
                        <label htmlFor="expires_at" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                            Tanggal berakhir (opsional)
                        </label>
                        <input
                            id="expires_at"
                            type="datetime-local"
                            value={form.data.expires_at}
                            onChange={e => form.setData('expires_at', e.target.value)}
                            className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                        />
                        {form.errors.expires_at && (
                            <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.expires_at}</p>
                        )}
                    </div>
                </div>

                {/* Live Preview Column (Right) */}
                <div className="lg:col-span-5 space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                            Pratinjau Tampilan Orang Tua
                        </h2>
                        <p className="text-xs text-stone-500 mt-0.5">
                            Tampilan di beranda web mobile orang tua
                        </p>
                    </div>

                    <div className="bg-stone-50 rounded-3xl p-6 border border-stone-200/80 max-w-sm mx-auto lg:mx-0 shadow-sm">
                        <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider pb-3 border-b border-stone-200/60 mb-4">
                            <span>Beranda Orang Tua</span>
                            <span>Pratinjau</span>
                        </div>

                        {/* Card in Mobile Feed */}
                        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                {form.data.is_pinned ? (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                                        <Pin size={11} strokeWidth={2} className="rotate-45" />
                                        Disematkan
                                    </span>
                                ) : (
                                    <span />
                                )}
                                <span className="text-xs text-stone-400">{formattedToday}</span>
                            </div>

                            <h3 className="text-base font-bold text-stone-900 leading-snug">
                                {form.data.title || 'Judul Pengumuman'}
                            </h3>

                            <p className="text-xs text-stone-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                                {previewBody}
                            </p>

                            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                                <span className="font-semibold text-[#0071E3] inline-flex items-center gap-1">
                                    <span>Baca selengkapnya</span>
                                    <ChevronRight size={13} strokeWidth={2} />
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium text-[11px]">
                                    {form.data.target === 'classroom' && selectedClassroomName
                                        ? selectedClassroomName
                                        : 'Semua Siswa'}
                                </span>
                            </div>
                        </div>

                        <p className="text-[11px] text-stone-400 text-center mt-4 leading-relaxed">
                            Disinkronkan secara langsung. Notifikasi push seluler akan terkirim ke akun terdaftar.
                        </p>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/80 py-4 px-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <p className="text-xs text-stone-400 hidden sm:block">
                        Draf otomatis tersimpan beberapa detik yang lalu
                    </p>
                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            type="button"
                            onClick={() => submit('draf')}
                            disabled={form.processing}
                            className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors disabled:opacity-50"
                        >
                            Simpan draf
                        </button>
                        <button
                            type="button"
                            onClick={() => submit('terbit')}
                            disabled={form.processing}
                            className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-sm disabled:opacity-50"
                        >
                            {form.processing ? 'Menyimpan…' : 'Terbitkan'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

Form.layout = getAdminLayout;

