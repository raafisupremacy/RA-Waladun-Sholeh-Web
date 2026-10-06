import RoleLayout, { NavItem } from './RoleLayout';

const items: NavItem[] = [{ label: 'Beranda', href: '/guru' }, { label: 'Jurnal', href: '/guru/jurnal' }, { label: 'Catatan Anekdot', href: '/guru/anekdot' }, { label: 'Riwayat', href: '/guru/riwayat' }];
export default function TeacherLayout(props: Omit<React.ComponentProps<typeof RoleLayout>, 'role' | 'items'>) { return <RoleLayout {...props} role="Guru" items={items} />; }
