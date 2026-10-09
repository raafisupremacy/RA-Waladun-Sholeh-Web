import RoleLayout, { NavItem } from './RoleLayout';
import { usePage } from '@inertiajs/react';
import AccountCreatedDialog from '@/Components/AccountCreatedDialog';
import SlidingNavTabs from '@/Components/SlidingNavTabs';

const items: NavItem[] = [
    { label: 'Beranda', href: '/admin' },
    {
        label: 'Siswa',
        href: '/admin/siswa',
        matchPrefixes: ['/admin/siswa', '/admin/orang-tua', '/admin/guru', '/admin/kelas'],
        children: [
            { label: 'Data siswa', href: '/admin/siswa' },
            { label: 'Orang tua', href: '/admin/orang-tua' },
            { label: 'Guru', href: '/admin/guru' },
            { label: 'Kelas', href: '/admin/kelas' },
        ],
    },
    {
        label: 'Keuangan',
        href: '/admin/tagihan',
        matchPrefixes: ['/admin/tagihan', '/admin/verifikasi', '/admin/buku-kas'],
        children: [
            { label: 'Tagihan SPP', href: '/admin/tagihan' },
            { label: 'Verifikasi pembayaran', href: '/admin/verifikasi' },
            { label: 'Buku kas', href: '/admin/buku-kas' },
        ],
    },
    { label: 'Pengumuman', href: '/admin/pengumuman', matchPrefixes: ['/admin/pengumuman'] },
    { label: 'Laporan', href: '/admin/laporan', matchPrefixes: ['/admin/laporan'] },
    { label: 'Audit Log', href: '/admin/audit-log', matchPrefixes: ['/admin/audit-log'] },
];
export default function AdminLayout({children, ...props}: Omit<React.ComponentProps<typeof RoleLayout>, 'role' | 'items'>) {
    const page = usePage();
    const shared = page.props as {appName?: string; schoolName?: string; flash?: {success?: string}};
    const master = ['/admin/siswa', '/admin/orang-tua', '/admin/guru', '/admin/kelas'].some(path => page.url.startsWith(path));
    const finance = ['/admin/tagihan', '/admin/verifikasi', '/admin/buku-kas'].some(path => page.url.startsWith(path));

    const masterTabs = [
        { label: 'Siswa', href: '/admin/siswa' },
        { label: 'Orang tua', href: '/admin/orang-tua' },
        { label: 'Guru', href: '/admin/guru' },
        { label: 'Kelas', href: '/admin/kelas' },
    ];

    const financeTabs = [
        { label: 'Tagihan', href: '/admin/tagihan' },
        { label: 'Verifikasi', href: '/admin/verifikasi' },
        { label: 'Buku kas', href: '/admin/buku-kas' },
    ];

    return (
        <RoleLayout appName={shared.appName} schoolName={shared.schoolName} {...props} role="Admin" items={items}>
            {master && <SlidingNavTabs storageKey="admin-master-tabs" tabs={masterTabs} ariaLabel="Data sekolah" className="mb-6" />}
            {finance && <SlidingNavTabs storageKey="admin-finance-tabs" tabs={financeTabs} ariaLabel="Menu navigasi keuangan" className="mb-6" />}
            {shared.flash?.success && <p className="notice" role="status">{shared.flash.success}</p>}
            {children}
            <AccountCreatedDialog />
        </RoleLayout>
    );
}

export const getAdminLayout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

