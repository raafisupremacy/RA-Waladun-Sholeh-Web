import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { getAdminLayout } from '@/Layouts/AdminLayout';
import SegmentedControl from '@/Components/SegmentedControl';
import CustomSelect from '@/Components/CustomSelect';

type Classroom = { id: number; name: string; age_range: string };
type Guardian = { id: number; name: string; email: string };
type AcademicYear = { id: number; name: string };

export default function CreateStudent({
    classrooms,
    guardians,
    academicYear,
}: {
    classrooms: Classroom[];
    guardians: Guardian[];
    academicYear: AcademicYear | null;
}) {
    const currentYear = new Date().getFullYear();
    const form = useForm({
        name: '',
        nis: '',
        birth_date: '',
        gender: 'L',
        entry_year: currentYear.toString(),
        classroom_id: classrooms[0]?.id ? String(classrooms[0].id) : '',
        existing_guardian: false,
        guardian_id: '',
        relationship: 'ayah',
        guardian_name: '',
        guardian_email: '',
        guardian_phone: '',
        guardian_address: '',
    });

    const [guardianSearch, setGuardianSearch] = useState('');

    const filteredGuardians = guardians.filter(g =>
        g.name.toLowerCase().includes(guardianSearch.toLowerCase()) ||
        g.email.toLowerCase().includes(guardianSearch.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/siswa');
    };

    return (
        <>
            <Head title="Tambah Siswa" />

            <div className="max-w-[640px] mx-auto pb-28">
                {/* Header */}
                <header className="flex items-center justify-between pb-6 mb-8 border-b border-stone-200/80">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Tambah siswa</h1>
                        {academicYear && (
                            <p className="text-sm text-stone-500 mt-1">Tahun Ajaran {academicYear.name}</p>
                        )}
                    </div>
                    <Link
                        href="/admin/siswa"
                        className="text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
                    >
                        Batal
                    </Link>
                </header>

                <form onSubmit={handleSubmit} className="space-y-10">
                    {/* Bagian 1: Data Siswa */}
                    <section className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-stone-900 tracking-tight">Data siswa</h2>

                        <div>
                            <label htmlFor="name" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                Nama lengkap
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={form.data.name}
                                onChange={e => form.setData('name', e.target.value)}
                                placeholder="Contoh: Raditya Arka Wardhana"
                                className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                            />
                            {form.errors.name && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.name}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="nis" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    NIS
                                </label>
                                <input
                                    id="nis"
                                    type="text"
                                    required
                                    value={form.data.nis}
                                    onChange={e => form.setData('nis', e.target.value)}
                                    placeholder="2425-079"
                                    className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                />
                                {form.errors.nis && (
                                    <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.nis}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="entry_year" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    Tahun masuk
                                </label>
                                <input
                                    id="entry_year"
                                    type="number"
                                    required
                                    value={form.data.entry_year}
                                    onChange={e => form.setData('entry_year', e.target.value)}
                                    className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                />
                                {form.errors.entry_year && (
                                    <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.entry_year}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="birth_date" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    Tanggal lahir
                                </label>
                                <input
                                    id="birth_date"
                                    type="date"
                                    required
                                    value={form.data.birth_date}
                                    onChange={e => form.setData('birth_date', e.target.value)}
                                    className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                />
                                {form.errors.birth_date && (
                                    <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.birth_date}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    Kelas
                                </label>
                                <CustomSelect
                                    className="w-full"
                                    buttonClassName="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 h-auto"
                                    value={form.data.classroom_id}
                                    onChange={val => form.setData('classroom_id', String(val))}
                                    placeholder="Pilih kelas"
                                    options={[
                                        { value: '', label: 'Pilih kelas' },
                                        ...classrooms.map(c => ({
                                            value: String(c.id),
                                            label: `${c.name} (${c.age_range})`,
                                        })),
                                    ]}
                                />
                                {form.errors.classroom_id && (
                                    <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.classroom_id}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <span className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                Jenis kelamin
                            </span>
                            <SegmentedControl
                                options={['Laki-laki', 'Perempuan']}
                                value={form.data.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                                onChange={val => form.setData('gender', val === 'Laki-laki' ? 'L' : 'P')}
                            />
                            {form.errors.gender && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.gender}</p>
                            )}
                        </div>
                    </section>

                    {/* Bagian 2: Data Orang Tua */}
                    <section className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-stone-900 tracking-tight">Data orang tua</h2>
                                <p className="text-xs text-stone-500 mt-0.5">
                                    Cari orang tua terdaftar jika anak memiliki saudara kandung di TK
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.data.existing_guardian}
                                    onChange={e => {
                                        form.setData('existing_guardian', e.target.checked);
                                        form.clearErrors();
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0071E3]"></div>
                            </label>
                        </div>

                        <div>
                            <span className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                Hubungan
                            </span>
                            <SegmentedControl
                                options={['Ayah', 'Ibu', 'Wali']}
                                value={
                                    form.data.relationship === 'ayah'
                                        ? 'Ayah'
                                        : form.data.relationship === 'ibu'
                                        ? 'Ibu'
                                        : 'Wali'
                                }
                                onChange={val => form.setData('relationship', val.toLowerCase())}
                            />
                            {form.errors.relationship && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.relationship}</p>
                            )}
                        </div>

                        {form.data.existing_guardian ? (
                            <div className="space-y-3 pt-2">
                                <label htmlFor="guardian-search" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                                    Pilih orang tua terdaftar
                                </label>
                                <input
                                    id="guardian-search"
                                    type="text"
                                    value={guardianSearch}
                                    onChange={e => setGuardianSearch(e.target.value)}
                                    placeholder="Cari nama atau email orang tua..."
                                    className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                />
                                <select
                                    required
                                    size={4}
                                    value={form.data.guardian_id}
                                    onChange={e => form.setData('guardian_id', e.target.value)}
                                    className="w-full p-2 text-sm bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-stone-900"
                                >
                                    {filteredGuardians.length === 0 ? (
                                        <option disabled value="">Tidak ada akun yang cocok</option>
                                    ) : (
                                        filteredGuardians.map(g => (
                                            <option key={g.id} value={g.id} className="p-2 rounded-xl">
                                                {g.name} · {g.email}
                                            </option>
                                        ))
                                    )}
                                </select>
                                {form.errors.guardian_id && (
                                    <p className="text-xs text-red-600 font-medium">{form.errors.guardian_id}</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-5 pt-2">
                                <div>
                                    <label htmlFor="guardian_name" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Nama orang tua / wali
                                    </label>
                                    <input
                                        id="guardian_name"
                                        type="text"
                                        required
                                        value={form.data.guardian_name}
                                        onChange={e => form.setData('guardian_name', e.target.value)}
                                        placeholder="Contoh: Bambang Wardhana"
                                        className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                    />
                                    {form.errors.guardian_name && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.guardian_name}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="guardian_phone" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Nomor telepon / WhatsApp
                                    </label>
                                    <input
                                        id="guardian_phone"
                                        type="tel"
                                        required
                                        value={form.data.guardian_phone}
                                        onChange={e => form.setData('guardian_phone', e.target.value)}
                                        placeholder="0812-9844-3321"
                                        className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900"
                                    />
                                    {form.errors.guardian_phone && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.guardian_phone}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="guardian_email" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Email
                                    </label>
                                    <input
                                        id="guardian_email"
                                        type="email"
                                        required
                                        value={form.data.guardian_email}
                                        onChange={e => form.setData('guardian_email', e.target.value)}
                                        placeholder="bambang.wardhana@gmail.com"
                                        className={`w-full px-4 py-3 text-sm bg-stone-50 border rounded-2xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-stone-900 ${
                                            form.errors.guardian_email
                                                ? 'border-red-500 focus:ring-red-500 bg-red-50/30'
                                                : 'border-stone-200 focus:ring-[#0071E3]'
                                        }`}
                                    />
                                    {form.errors.guardian_email && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.guardian_email}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="guardian_address" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                        Alamat tinggal
                                    </label>
                                    <textarea
                                        id="guardian_address"
                                        required
                                        rows={3}
                                        value={form.data.guardian_address}
                                        onChange={e => form.setData('guardian_address', e.target.value)}
                                        placeholder="Jl. Cempaka Putih No. 14, Jakarta Pusat"
                                        className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all text-stone-900 resize-none"
                                    />
                                    {form.errors.guardian_address && (
                                        <p className="mt-1.5 text-xs text-red-600 font-medium">{form.errors.guardian_address}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                                    <span>Akun orang tua dibuat otomatis memakai email di atas.</span>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Sticky Bottom Action Bar */}
                    <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/80 py-4 px-6 shadow-lg">
                        <div className="max-w-[640px] mx-auto flex items-center justify-between">
                            <Link
                                href="/admin/siswa"
                                className="text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="px-7 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-sm disabled:opacity-50"
                            >
                                {form.processing ? 'Menyimpan…' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

CreateStudent.layout = getAdminLayout;

