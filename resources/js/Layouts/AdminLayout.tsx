import RoleLayout, { NavItem } from './RoleLayout';
import { Link, usePage } from '@inertiajs/react';
import AccountCreatedDialog from '@/Components/AccountCreatedDialog';

const items: NavItem[] = [{ label: 'Beranda', href: '/admin' }, { label: 'Siswa', href: '/admin/siswa' }, { label: 'Keuangan', href: '/admin/tagihan' }, { label: 'Pengumuman', href: '/admin/pengumuman' }, { label: 'Laporan', href: '/admin/laporan' }];
export default function AdminLayout({children, ...props}: Omit<React.ComponentProps<typeof RoleLayout>, 'role' | 'items'>) {
    const page = usePage();
    const shared = page.props as {appName?: string; schoolName?: string; flash?: {success?: string}};
    const master = ['/admin/siswa', '/admin/orang-tua', '/admin/guru', '/admin/kelas'].some(path => page.url.startsWith(path));
    const tabs = [{label:'Siswa', href:'/admin/siswa'}, {label:'Orang tua', href:'/admin/orang-tua'}, {label:'Guru', href:'/admin/guru'}, {label:'Kelas', href:'/admin/kelas'}];
    return <RoleLayout appName={shared.appName} schoolName={shared.schoolName} {...props} role="Admin" items={items}>
        {master && <nav className="master-tabs" aria-label="Data sekolah">{tabs.map(tab => <Link key={tab.href} href={tab.href} aria-current={page.url.startsWith(tab.href) ? 'page' : undefined}>{tab.label}</Link>)}</nav>}
        {shared.flash?.success && <p className="notice" role="status">{shared.flash.success}</p>}
        {children}<AccountCreatedDialog />
    </RoleLayout>;
}
