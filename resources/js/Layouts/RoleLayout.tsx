import { useEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, ChartNoAxesCombined, ChevronDown, FileText, Home, Menu, NotebookPen, Receipt, UserRound } from 'lucide-react';
import BottomSheet from '@/Components/BottomSheet';

export type NavItem = { label: string; href: string; matchPrefixes?: string[]; children?: NavItem[] };
const icons: Record<string, typeof Home> = {
    Beranda: Home,
    Ringkasan: Home,
    Tagihan: Receipt,
    Perkembangan: ChartNoAxesCombined,
    Profil: UserRound,
    Jurnal: BookOpen,
    'Catatan Anekdot': NotebookPen,
    Riwayat: FileText,
    'Laporan Keuangan': Receipt,
    'Laporan Evaluasi': ChartNoAxesCombined,
};

export default function RoleLayout({
    appName = '',
    schoolName = '',
    role,
    items,
    children,
    hideFooter = false,
}: {
    appName?: string;
    schoolName?: string;
    role: string;
    items: NavItem[];
    children: React.ReactNode;
    hideFooter?: boolean;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const headerRef = useRef<HTMLElement>(null);
    const page = usePage();
    const pageProps = page.props as {
        appName?: string;
        schoolName?: string;
        schoolSettings?: Record<string, string>;
        auth?: { user?: { name?: string } };
    };
    const user = pageProps.auth?.user;
    const effectiveAppName = appName || pageProps.appName || 'SKMS';
    const effectiveSchoolName = schoolName || pageProps.schoolName || pageProps.schoolSettings?.school_name || '';
    const hasMenuSheet = role === 'Admin';
    const pathname = page.url.split('?')[0];

    const isItemActive = (item: NavItem) => {
        if (item.matchPrefixes) {
            return item.matchPrefixes.some(p => pathname === p || pathname.startsWith(p + '/'));
        }
        if (item.children) {
            if (item.children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))) {
                return true;
            }
        }
        if (item.href === '/admin' || item.href === '/guru' || item.href === '/kepsek' || item.href === '/ortu') {
            return pathname === item.href;
        }
        return pathname === item.href || pathname.startsWith(item.href + '/');
    };

    // Close dropdown on click outside or Escape
    useEffect(() => {
        if (!openDropdown) return;

        const handlePointerDown = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.closest('.nav-dropdown') || target.closest('.user-menu'))) {
                return;
            }
            setOpenDropdown(null);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenDropdown(null);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [openDropdown]);

    // Close dropdown when route changes
    useEffect(() => {
        setOpenDropdown(null);
    }, [pathname]);

    return (
        <div
            className={
                'app-shell' +
                (role === 'Orang Tua' ? ' parent-shell' : '') +
                (role === 'Guru' ? ' teacher-shell' : '') +
                (hasMenuSheet ? ' admin-shell' : '')
            }
        >
            <header className="global-nav" ref={headerRef}>
                <Link href="/" className="wordmark">
                    {effectiveAppName}
                </Link>
                <nav className="desktop-nav" aria-label="Navigasi utama">
                    {items.map(item => {
                        const isActive = isItemActive(item);

                        if (item.children && item.children.length > 0) {
                            const isOpen = openDropdown === item.label;
                            return (
                                <div key={item.href} className="nav-dropdown">
                                    <button
                                        type="button"
                                        onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                                        aria-expanded={isOpen}
                                        aria-haspopup="true"
                                        className={`nav-dropdown-trigger ${isActive ? 'is-active' : ''}`}
                                    >
                                        <span>{item.label}</span>
                                        <ChevronDown
                                            size={14}
                                            strokeWidth={2}
                                            className={`nav-dropdown-chevron ${isOpen ? 'is-open' : ''}`}
                                            aria-hidden="true"
                                        />
                                    </button>
                                    {isOpen && (
                                        <div className="nav-dropdown-popover user-menu-popover" role="menu">
                                            {item.children.map(child => (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    role="menuitem"
                                                    onClick={() => setOpenDropdown(null)}
                                                    className={pathname === child.href ? 'is-active' : ''}
                                                >
                                                    {child.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={isActive ? 'is-active' : ''}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="user-menu">
                    <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'user' ? null : 'user')}
                        aria-expanded={openDropdown === 'user'}
                        aria-haspopup="true"
                        className="user-menu-trigger"
                    >
                        <span>{user?.name ?? role}</span>
                        <UserRound size={18} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                    {openDropdown === 'user' && (
                        <div className="user-menu-popover" role="menu">
                            <Link
                                href={role === 'Orang Tua' ? '/ortu/profil' : '/ganti-kata-sandi'}
                                role="menuitem"
                                onClick={() => setOpenDropdown(null)}
                            >
                                {role === 'Orang Tua' ? 'Profil' : 'Ganti kata sandi'}
                            </Link>
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                role="menuitem"
                                onClick={() => setOpenDropdown(null)}
                            >
                                Keluar
                            </Link>
                        </div>
                    )}
                </div>
                {hasMenuSheet && (
                    <button
                        className="mobile-menu"
                        type="button"
                        aria-label="Buka menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(true)}
                    >
                        <Menu size={20} strokeWidth={1.5} />
                    </button>
                )}
            </header>
            {hasMenuSheet && (
                <BottomSheet open={menuOpen} title="Menu" onClose={() => setMenuOpen(false)} drawer>
                    <nav className="admin-menu-groups" aria-label="Menu admin">
                        {items.map(item =>
                            item.children ? (
                                <section key={item.href}>
                                    <h3>{item.label}</h3>
                                    {item.children.map(child => (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            className={
                                                pathname === child.href || pathname.startsWith(child.href + '/')
                                                    ? 'is-active'
                                                    : ''
                                            }
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            {child.label}
                                        </Link>
                                    ))}
                                </section>
                            ) : (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={isItemActive(item) ? 'is-active' : ''}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            )
                        )}
                        <section>
                            <h3>Akun</h3>
                            <Link href="/ganti-kata-sandi">Ganti kata sandi</Link>
                            <Link href="/logout" method="post" as="button">
                                Keluar
                            </Link>
                        </section>
                    </nav>
                </BottomSheet>
            )}
            <main className="page-content">{children}</main>
            {!hasMenuSheet && (
                <nav
                    className="mobile-tabbar"
                    style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
                    aria-label={`Navigasi ${role}`}
                >
                    {items.map(item => {
                        const Icon = icons[item.label] ?? FileText;
                        const isActive = isItemActive(item);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={isActive ? 'is-active' : ''}
                            >
                                <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            )}
            {!hideFooter && (
                <footer className="app-footer">
                    © {new Date().getFullYear()} {effectiveSchoolName ? `${effectiveSchoolName} · ` : ''}Sistem Informasi dan Keuangan Sekolah
                </footer>
            )}
        </div>
    );
}
