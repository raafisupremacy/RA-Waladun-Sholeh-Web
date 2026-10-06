import { Link, usePage } from '@inertiajs/react';
import { UserRound } from 'lucide-react';
import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ showFooter?: boolean }>;

export default function Guest({ children, showFooter = false }: Props) {
    const props = usePage().props as { appName?: string; schoolSettings?: Record<string, string> };

    return (
        <div className="guest-shell">
            <header className="guest-nav">
                <div className="guest-nav-inner">
                    <Link href="/" className="wordmark">{props.appName || ''}</Link>
                    <span className="guest-mobile-avatar" aria-hidden="true"><UserRound size={18} strokeWidth={1.8} /></span>
                </div>
            </header>
            <main className="guest-card">{children}</main>
            {showFooter && <footer className="guest-footer">© {new Date().getFullYear()} {props.schoolSettings?.school_name || ''} · Sistem Informasi dan Keuangan Sekolah</footer>}
        </div>
    );
}
