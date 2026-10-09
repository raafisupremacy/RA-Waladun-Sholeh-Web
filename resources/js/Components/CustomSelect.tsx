import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type SelectOption = {
    value: string | number;
    label: string;
    disabled?: boolean;
};

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Pilih opsi',
    className = '',
    buttonClassName = '',
    menuClassName = '',
    disabled = false,
}: {
    value: string | number;
    onChange: (value: any) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    buttonClassName?: string;
    menuClassName?: string;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => String(opt.value) === String(value));

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const isFullWidth = className.includes('w-full');

    return (
        <div
            ref={containerRef}
            className={`relative ${isFullWidth ? 'block w-full' : 'inline-block'} text-left ${className}`}
        >
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`h-10 px-4 rounded-full border border-[var(--separator)] bg-[var(--surface)] text-sm font-medium text-[var(--text-1,#1D1D1F)] flex items-center justify-between gap-2.5 cursor-pointer shadow-xs hover:border-stone-400 hover:bg-[#F5F5F7] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                    isFullWidth ? 'w-full' : ''
                } ${buttonClassName}`}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown
                    size={16}
                    strokeWidth={1.5}
                    className={`text-[var(--text-3,#86868B)] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div
                    role="listbox"
                    className={`absolute z-50 mt-1.5 min-w-full ${
                        isFullWidth ? 'w-full' : 'w-max max-w-[280px]'
                    } bg-[var(--surface,#FFFFFF)] rounded-2xl border border-[var(--separator,#E5E5EA)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 right-0 sm:right-auto sm:left-0 ${menuClassName}`}
                >
                    {options.map((opt) => {
                        const isSelected = String(opt.value) === String(value);
                        const isDisabled = opt.disabled;
                        return (
                            <div
                                key={String(opt.value)}
                                role="option"
                                aria-selected={isSelected}
                                aria-disabled={isDisabled}
                                onClick={() => {
                                    if (isDisabled) return;
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`px-3.5 py-2 text-sm rounded-xl flex items-center justify-between gap-3 transition-colors duration-150 select-none ${
                                    isDisabled
                                        ? 'opacity-40 cursor-not-allowed text-stone-400'
                                        : isSelected
                                        ? 'bg-[var(--accent-soft,#E8F1FD)] text-[var(--accent,#0071E3)] font-semibold cursor-pointer'
                                        : 'text-[var(--text,#1D1D1F)] hover:bg-[#F5F5F7] cursor-pointer'
                                }`}
                            >
                                <span className="truncate">{opt.label}</span>
                                {isSelected && (
                                    <Check size={14} strokeWidth={1.5} className="shrink-0 text-[var(--accent,#0071E3)]" />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
