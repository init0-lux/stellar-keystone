module.exports = {
    root: true,
    env: {
        node: true,
        es2022: true,
    },
    extends: [
        'eslint:recommended',
    ],
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': 'off',
        'prefer-const': 'error',
        'eqeqeq': ['error', 'always'],
    },
    overrides: [
        {
            files: ['**/*.ts', '**/*.tsx'],
            parser: '@typescript-eslint/parser',
            extends: [
                'eslint:recommended',
                'plugin:@typescript-eslint/recommended',
            ],
            plugins: ['@typescript-eslint'],
            rules: {
                '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/no-explicit-any': 'warn',
            },
        },
    ],
};
