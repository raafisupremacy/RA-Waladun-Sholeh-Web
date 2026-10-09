import eslint from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['public/**', 'node_modules/**', 'storage/**', 'vendor/**', 'scripts/**'] },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['resources/js/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'no-undef': 'off',
        },
    },
    { linterOptions: { reportUnusedDisableDirectives: 'off' } },
);
