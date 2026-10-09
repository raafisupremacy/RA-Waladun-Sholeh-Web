import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';

export type NavTab = {
    label: string;
    href: string;
};

export default function SlidingNavTabs({
    tabs,
    ariaLabel = 'Navigasi',
    className = '',
}: {
    tabs: NavTab[];
    storageKey?: string;
    ariaLabel?: string;
    className?: string;
}) {
    const page = usePage();
    const pathname = page.url.split('?')[0];

    // Determine current active index from URL
    const activeIdx = (() => {
        const idx = tabs.findIndex(tab => {
            if (tab.href === '/admin/siswa') {
                return pathname === '/admin/siswa' || pathname.startsWith('/admin/siswa/');
            }
            return pathname === tab.href || pathname.startsWith(tab.href + '/');
        });
        return idx >= 0 ? idx : 0;
    })();

    const containerRef = useRef<HTMLElement>(null);
    const tabRefs = useRef<Record<number, HTMLAnchorElement | null>>({});

    const [pillStyle, setPillStyle] = useState<{
        left: number;
        top: number;
        width: number;
        height: number;
    }>({ left: 0, top: 0, width: 0, height: 0 });

    const [isReady, setIsReady] = useState(false);

    // Measure position for a specific index
    const measureIndex = useCallback((idx: number) => {
        const container = containerRef.current;
        const targetEl = tabRefs.current[idx];
        if (!container || !targetEl) return null;

        const containerRect = container.getBoundingClientRect();
        const elRect = targetEl.getBoundingClientRect();

        return {
            left: elRect.left - containerRect.left,
            top: elRect.top - containerRect.top,
            width: elRect.width,
            height: elRect.height,
        };
    }, []);

    // Synchronously place the pill before paint
    useLayoutEffect(() => {
        const rect = measureIndex(activeIdx);
        if (rect && rect.width > 0) {
            setPillStyle(rect);
            if (!isReady) {
                // Turn on transition after initial placement
                const raf = requestAnimationFrame(() => {
                    setIsReady(true);
                });
                return () => cancelAnimationFrame(raf);
            }
        }
    }, [activeIdx, isReady, measureIndex]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const rect = measureIndex(activeIdx);
            if (rect && rect.width > 0) {
                setPillStyle(rect);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [activeIdx, measureIndex]);

    // Instant response on click
    const handleTabClick = (idx: number) => {
        const rect = measureIndex(idx);
        if (rect && rect.width > 0) {
            setIsReady(true);
            setPillStyle(rect);
        }
    };

    return (
        <nav
            ref={containerRef}
            className={`master-tabs has-sliding-indicator ${isReady ? 'is-ready' : ''} relative ${className}`}
            aria-label={ariaLabel}
        >
            {/* Sliding White Capsule Indicator */}
            <div
                aria-hidden="true"
                className="master-tabs-indicator"
                style={{
                    position: 'absolute',
                    top: `${pillStyle.top}px`,
                    left: 0,
                    transform: `translate3d(${pillStyle.left}px, 0, 0)`,
                    width: `${pillStyle.width}px`,
                    height: `${pillStyle.height}px`,
                    opacity: isReady && pillStyle.width > 0 ? 1 : 0,
                    transition: isReady
                        ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        : 'none',
                }}
            />

            {/* Tab Links */}
            {tabs.map((tab, idx) => {
                const isActive = idx === activeIdx;

                return (
                    <Link
                        key={tab.href}
                        ref={(el) => {
                            tabRefs.current[idx] = (el as unknown) as HTMLAnchorElement | null;
                        }}
                        href={tab.href}
                        preserveScroll
                        onClick={() => handleTabClick(idx)}
                        aria-current={isActive ? 'page' : undefined}
                        className={isActive ? 'is-active' : ''}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
