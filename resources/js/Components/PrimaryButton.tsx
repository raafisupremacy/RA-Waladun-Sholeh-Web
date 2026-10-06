import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    type = 'submit',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={`button-primary ${disabled ? 'is-disabled' : ''} ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
