import AdminLayout from '@/Layouts/AdminLayout';
import TeacherLayout from '@/Layouts/TeacherLayout';
import PrincipalLayout from '@/Layouts/PrincipalLayout';
import ParentLayout from '@/Layouts/ParentLayout';
import { Head } from '@inertiajs/react';

export default function Placeholder({ role, appName = '', schoolName = '' }: { role: string; appName?: string; schoolName?: string }) {
    const content = <><Head title="Beranda" /><section className="styleguide-intro"><p className="eyebrow">{role}</p><h1>Halaman akan dibuat di milestone berikutnya</h1></section></>;
    if (role === 'admin') return <AdminLayout appName={appName} schoolName={schoolName}>{content}</AdminLayout>;
    if (role === 'guru') return <TeacherLayout appName={appName} schoolName={schoolName}>{content}</TeacherLayout>;
    if (role === 'kepala_sekolah') return <PrincipalLayout appName={appName} schoolName={schoolName}>{content}</PrincipalLayout>;
    return <ParentLayout appName={appName} schoolName={schoolName}>{content}</ParentLayout>;
}
