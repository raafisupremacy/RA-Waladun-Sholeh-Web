import { useCallback, useEffect, useRef, useState } from 'react';

type Option = string | { key: string; label: string; activeColor?: string };

const LEVEL_COLORS: Record<string, { bg: string; text: string; border?: string; shadow?: string }> = {
    BB: {
        bg: '#EEF2F8',
        text: '#31547A',
        border: 'transparent',
        shadow: '0 1px 3px rgba(49, 84, 122, 0.12)',
    },
    MB: {
        bg: '#DCEAFE',
        text: '#235D9C',
        border: 'transparent',
        shadow: '0 1px 3px rgba(35, 93, 156, 0.15)',
    },
    BSH: {
        bg: '#C9E2FC',
        text: '#0B6BC5',
        border: 'transparent',
        shadow: '0 1px 3px rgba(11, 107, 197, 0.15)',
    },
    BSB: {
        bg: 'var(--primary)',
        text: '#FFFFFF',
        border: 'transparent',
        shadow: '0 2px 6px rgba(0, 113, 227, 0.25)',
    },
};

export default function SegmentedControl({
    options,
    value,
    onChange,
    disabled = false,
    className = '',
}: {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [selectedKey, setSelectedKey] = useState(value);
    const [pillStyle, setPillStyle] = useState<{ left: number; width: number; height: number; top: number }>({
        left: 0,
        width: 0,
        height: 0,
        top: 0,
    });
    const [isReady, setIsReady] = useState(false);

    // Synchronize with external value prop
    useEffect(() => {
        setSelectedKey(value);
    }, [value]);

    const measurePill = useCallback((targetKey: string) => {
        const container = containerRef.current;
        const targetBtn = buttonRefs.current[targetKey];

        if (container && targetBtn) {
            const containerRect = container.getBoundingClientRect();
            const btnRect = targetBtn.getBoundingClientRect();
            return {
                left: btnRect.left - containerRect.left,
                width: btnRect.width,
                height: btnRect.height,
                top: btnRect.top - containerRect.top,
            };
        }
        return null;
    }, []);

    // Update pill position when selectedKey or options change
    useEffect(() => {
        const rect = measurePill(selectedKey);
        if (rect) {
            setPillStyle(rect);
            if (!isReady) {
                const raf = requestAnimationFrame(() => setIsReady(true));
                return () => cancelAnimationFrame(raf);
            }
        } else {
            setPillStyle((prev) => ({ ...prev, width: 0 }));
        }

        const handleResize = () => {
            const resizedRect = measurePill(selectedKey);
            if (resizedRect) setPillStyle(resizedRect);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [selectedKey, isReady, measurePill, options]);

    // Optimistic instant movement on click
    const handleSelect = (key: string) => {
        if (disabled || key === selectedKey) return;
        setSelectedKey(key);

        const rect = measurePill(key);
        if (rect) {
            setIsReady(true);
            setPillStyle(rect);
        }
        onChange(key);
    };

    const activeColor = LEVEL_COLORS[selectedKey];

    return (
        <div
            ref={containerRef}
            className={`segmented-control relative inline-flex items-center p-1 rounded-full bg-[#EEEEF1] select-none ${className}`}
            role="tablist"
        >
            {/* Sliding Adaptive Pill Indicator */}
            <div
                aria-hidden="true"
                style={{
                    transform: `translate3d(${pillStyle.left}px, ${pillStyle.top}px, 0)`,
                    width: `${pillStyle.width}px`,
                    height: `${pillStyle.height}px`,
                    opacity: isReady && pillStyle.width > 0 ? 1 : 0,
                    backgroundColor: activeColor ? activeColor.bg : '#FFFFFF',
                    borderColor: activeColor?.border ?? 'transparent',
                    boxShadow: activeColor?.shadow ?? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
                    transition: isReady
                        ? 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), width 0.24s cubic-bezier(0.16, 1, 0.3, 1), height 0.24s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.18s ease-out, border-color 0.18s ease-out, box-shadow 0.18s ease-out'
                        : 'none',
                }}
                className="absolute left-0 top-0 rounded-full border pointer-events-none z-0"
            />

            {options.map((option) => {
                const key = typeof option === 'string' ? option : option.key;
                const label = typeof option === 'string' ? option : option.label;
                const isSelected = key === selectedKey;
                const optionColor = LEVEL_COLORS[key];

                let textColor = 'text-[var(--text-2,var(--muted))] hover:text-[var(--text,var(--ink))]';
                if (isSelected) {
                    if (optionColor) {
                        textColor = optionColor.text === '#FFFFFF' ? 'text-white font-bold' : 'font-bold';
                    } else {
                        textColor = 'text-[var(--text,var(--ink))] font-semibold';
                    }
                }

                return (
                    <button
                        key={key}
                        ref={(el) => {
                            buttonRefs.current[key] = el;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        disabled={disabled}
                        style={{
                            color: isSelected && optionColor ? optionColor.text : undefined,
                        }}
                        className={`relative z-10 min-h-[38px] px-3.5 py-1.5 text-sm rounded-full border-0 bg-transparent cursor-pointer whitespace-nowrap transition-colors duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${textColor}`}
                        onClick={() => handleSelect(key)}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

