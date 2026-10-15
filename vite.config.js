import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
        host: '127.0.0.1',
        port: 5173,
        cors: true,
    },
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
    ],
    optimizeDeps: {
        include: [
            'react',
            'react/jsx-runtime',
            'react-dom',
            'react-dom/client',
            '@inertiajs/react',
            'laravel-vite-plugin/inertia-helpers',
            'lucide-react',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'axios',
        ],
    },
});
