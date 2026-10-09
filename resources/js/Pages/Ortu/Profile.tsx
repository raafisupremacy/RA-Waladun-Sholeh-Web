import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import ParentLayout from '@/Layouts/ParentLayout';
import StatusCapsule from '@/Components/StatusCapsule';

type Student = {
    id: number;
    name: string;
    nis: string;
    classroom?: string | null;
    status: string;
};

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('');
}

export default function Profile({
    guardian,
    students,
}: {
    guardian: { name: string; email: string; phone?: string | null };
    students: Student[];
}) {
    const page = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    return (
        <ParentLayout appName={page.appName} schoolName={page.schoolSettings?.school_name}>
            <Head title="Profil" />

            <div className="max-w-xl mx-auto py-8 space-y-8 pb-24">
                {/* Hero Header */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-100 text-[#0071E3] flex items-center justify-center font-bold text-2xl shadow-sm">
                        {getInitials(guardian.name)}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight mt-4">
                        {guardian.name}
                    </h1>
                    <p className="text-sm text-stone-500 mt-0.5">{guardian.email}</p>
                </div>

                {/* Card 1: Data Orang Tua */}
                <section className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">Data orang tua</h2>
                    <dl className="divide-y divide-stone-100 text-sm">
                        <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                            <dt className="text-stone-400">Nama lengkap</dt>
                            <dd className="font-semibold text-stone-900 sm:text-right">{guardian.name}</dd>
                        </div>
                        <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                            <dt className="text-stone-400">Email</dt>
                            <dd className="font-semibold text-stone-900 sm:text-right">{guardian.email}</dd>
                        </div>
                        <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                            <dt className="text-stone-400">Nomor telepon / WhatsApp</dt>
                            <dd className="font-semibold text-stone-900 sm:text-right">
                                {guardian.phone || 'Belum diisi'}
                            </dd>
                        </div>
                    </dl>
                    <p className="text-xs text-stone-400 pt-2 border-t border-stone-100">
                        Untuk mengubah data, hubungi Tata Usaha.
                    </p>
                </section>

                {/* Card 2: Anak */}
                <section className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">Anak</h2>
                    {students.length === 0 ? (
                        <p className="text-sm text-stone-400 py-4 text-center">Belum ada anak terhubung.</p>
                    ) : (
                        <div className="divide-y divide-stone-100">
                            {students.map(student => (
                                <div key={student.id} className="py-3.5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0071E3] flex items-center justify-center font-bold text-xs shrink-0">
                                            {getInitials(student.name)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-stone-900 text-sm">
                                                {student.name}
                                            </h3>
                                            <p className="text-xs text-stone-500">
                                                {student.classroom ?? 'Belum ada kelompok'} · NIS {student.nis}
                                            </p>
                                        </div>
                                    </div>
                                    <StatusCapsule status={student.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Card 3: Akun Tindakan */}
                <section className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-4 divide-y divide-stone-100">
                    <Link
                        href="/ganti-kata-sandi"
                        className="flex items-center justify-between py-2 text-stone-800 font-semibold text-sm hover:text-[#0071E3] transition-colors"
                    >
                        <span>Ganti kata sandi</span>
                        <ChevronRight size={18} className="text-stone-400" />
                    </Link>

                    <div className="pt-4">
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors w-full text-left"
                        >
                            Keluar
                        </Link>
                    </div>
                </section>
            </div>
        </ParentLayout>
    );
}
