import { ButtonHTMLAttributes } from 'react';

export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={`button-danger ${disabled ? 'is-disabled' : ''} ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
