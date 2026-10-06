import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.{ts,tsx}',
    ],
    theme: {
        container: { center: true, padding: '20px', screens: { sm: '640px', lg: '1024px' } },
        extend: {
            colors: {
                background: 'var(--bg)', foreground: 'var(--text)', border: 'var(--separator)', input: 'var(--separator)', ring: 'var(--accent)',
                primary: { DEFAULT: 'var(--accent)', foreground: '#FFFFFF' }, secondary: { DEFAULT: 'var(--accent-soft)', foreground: 'var(--accent)' }, muted: { DEFAULT: 'var(--bg)', foreground: 'var(--text-2)' },
                destructive: { DEFAULT: '#C4271B', foreground: '#FFFFFF' }, card: { DEFAULT: 'var(--surface)', foreground: 'var(--text)' }, popover: { DEFAULT: 'var(--surface)', foreground: 'var(--text)' },
            },
            fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Inter Variable"', 'Inter', 'system-ui', ...defaultTheme.fontFamily.sans] },
            borderRadius: { pill: '999px', tile: '28px', panel: '20px', input: '12px' },
            fontSize: { hero: ['56px', { lineHeight: '1.1', letterSpacing: '-0.02em' }], section: ['40px', { lineHeight: '1.15' }], tile: ['22px', { lineHeight: '1.27' }], body: ['17px', { lineHeight: '1.4' }], caption: ['14px', { lineHeight: '1.3' }] },
        },
    },
    plugins: [forms],
};
