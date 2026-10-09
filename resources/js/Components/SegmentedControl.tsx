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
        bg: '#0071E3',
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
    const [pillStyle, setPillStyle] = useState<{ left: number; width: number; height: number; top: number }>({
        left: 0,
        width: 0,
        height: 0,
        top: 0,
    });
    const [isReady, setIsReady] = useState(false);

    const updatePill = useCallback(() => {
        const container = containerRef.current;
        const targetBtn = buttonRefs.current[value];

        if (container && targetBtn) {
            const containerRect = container.getBoundingClientRect();
            const btnRect = targetBtn.getBoundingClientRect();
            setPillStyle({
                left: btnRect.left - containerRect.left,
                width: btnRect.width,
                height: btnRect.height,
                top: btnRect.top - containerRect.top,
            });
            setIsReady(true);
        } else {
            setPillStyle((prev) => ({ ...prev, width: 0 }));
        }
    }, [value]);

    useEffect(() => {
        updatePill();
        const handleResize = () => updatePill();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updatePill, options]);

    const activeColor = LEVEL_COLORS[value];

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
                        ? 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), width 0.2s cubic-bezier(0.16, 1, 0.3, 1), height 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.18s ease-out, border-color 0.18s ease-out, box-shadow 0.18s ease-out'
                        : 'none',
                }}
                className="absolute left-0 top-0 rounded-full border pointer-events-none z-0"
            />

            {options.map((option) => {
                const key = typeof option === 'string' ? option : option.key;
                const label = typeof option === 'string' ? option : option.label;
                const isSelected = key === value;
                const optionColor = LEVEL_COLORS[key];

                let textColor = 'text-[var(--text-2,#6E6E73)] hover:text-[var(--text,#1D1D1F)]';
                if (isSelected) {
                    if (optionColor) {
                        textColor = optionColor.text === '#FFFFFF' ? 'text-white font-bold' : 'font-bold';
                    } else {
                        textColor = 'text-[var(--text,#1D1D1F)] font-semibold';
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
                        onClick={() => onChange(key)}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

