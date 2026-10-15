import { Link, usePage } from '@inertiajs/react';
import { UserRound } from 'lucide-react';
import { PropsWithChildren } from 'react';
import BrandMark from '@/Components/BrandMark';

type Props = PropsWithChildren<{ showFooter?: boolean }>;

export default function Guest({ children, showFooter = false }: Props) {
    const props = usePage().props as { appName?: string; schoolName?: string; brandAssets?: { logo?: boolean; schoolPhoto?: boolean } };

    return (
        <div className="guest-shell">
            <header className="guest-nav">
                <div className="guest-nav-inner">
                    <Link href="/" className="wordmark"><BrandMark appName={props.appName} schoolName={props.schoolName} /></Link>
                    <span className="guest-mobile-avatar" aria-hidden="true"><UserRound size={18} strokeWidth={1.8} /></span>
                </div>
            </header>
            <div className="guest-auth-grid">
                <aside
                    className="guest-photo-panel"
                    aria-label="Suasana sekolah"
                    style={props.brandAssets?.schoolPhoto ? { backgroundImage: 'url(/brand/school.jpg)' } : undefined}
                >
                    <div>{props.schoolName}</div>
                </aside>
                <main className="guest-card">{children}</main>
            </div>
            {showFooter && <footer className="guest-footer">© {new Date().getFullYear()} {props.schoolName || ''} · Sistem Informasi dan Keuangan Sekolah</footer>}
        </div>
    );
}
