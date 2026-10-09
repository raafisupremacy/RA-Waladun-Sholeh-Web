import RoleLayout, { NavItem } from './RoleLayout';

const items: NavItem[] = [{ label: 'Ringkasan', href: '/kepsek' }, { label: 'Laporan Keuangan', href: '/kepsek/laporan-keuangan' }, { label: 'Laporan Evaluasi', href: '/kepsek/laporan-evaluasi' }];
export default function PrincipalLayout(props: Omit<React.ComponentProps<typeof RoleLayout>, 'role' | 'items'>) { return <RoleLayout {...props} role="Kepala Sekolah" items={items} />; }
export const getPrincipalLayout = (page: React.ReactNode) => <PrincipalLayout>{page}</PrincipalLayout>;
