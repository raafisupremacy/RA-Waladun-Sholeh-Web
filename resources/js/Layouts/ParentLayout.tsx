import RoleLayout, { NavItem } from './RoleLayout';

const items: NavItem[] = [{ label: 'Beranda', href: '/ortu' }, { label: 'Tagihan', href: '/ortu/tagihan' }, { label: 'Perkembangan', href: '/ortu/perkembangan' }, { label: 'Profil', href: '/ortu/profil' }];
export default function ParentLayout(props: Omit<React.ComponentProps<typeof RoleLayout>, 'role' | 'items'>) { return <RoleLayout {...props} role="Orang Tua" items={items} />; }
