import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { LogOut, Menu } from 'lucide-react';

export type NavItem = { label: string; href: string };

export default function RoleLayout({ appName = '', schoolName = '', role, items, children }: { appName?: string; schoolName?: string; role: string; items: NavItem[]; children: React.ReactNode }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const hasMenuSheet = role === 'Admin';

    return <div className="app-shell">
        <header className="global-nav"><Link href="/" className="wordmark">{appName}</Link><nav className="desktop-nav">{items.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>{hasMenuSheet && <button className="mobile-menu" type="button" aria-label="Buka menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={20} /></button>}<span className="role-label">{role}</span></header>
        {hasMenuSheet && menuOpen && <div className="mobile-menu-backdrop" role="presentation" onClick={() => setMenuOpen(false)}><nav className="mobile-menu-sheet" aria-label="Menu utama" onClick={(event) => event.stopPropagation()}><div className="sheet-heading"><strong>Menu</strong><button type="button" onClick={() => setMenuOpen(false)} aria-label="Tutup menu">×</button></div>{items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</nav></div>}
        <main className="page-content">{children}</main>
        <nav className="mobile-tabbar" aria-label={`Navigasi ${role}`}>{items.slice(0, 4).map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
        <footer className="app-footer">© {new Date().getFullYear()} {schoolName} · Sistem Informasi dan Keuangan Sekolah <Link href="/logout" method="post" as="button" className="footer-logout"><LogOut size={14} /> Keluar</Link></footer>
    </div>;
}
