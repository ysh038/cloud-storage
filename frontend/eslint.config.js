import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import prettierPlugin from 'eslint-plugin-prettier'

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ['**/index.ts', 'vite.config.ts'],
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.app.json',
                tsconfigRootDir: './',
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            import: importPlugin,
            prettier: prettierPlugin,
        },
        rules: {
            'prettier/prettier': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-vars': 'error',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'import/order': [
                'warn',
                {
                    groups: [
                        ['builtin', 'external'],
                        ['internal', 'parent', 'sibling', 'index'],
                    ],
                    pathGroups: [
                        {
                            pattern: '@/**',
                            group: 'internal',
                            position: 'after',
                        },
                        {
                            pattern: '**/*.{css,scss,sass}',
                            group: 'internal',
                            position: 'after',
                        },
                        {
                            pattern: '**/*.{png,jpg,jpeg,gif,svg,webp}',
                            group: 'internal',
                            position: 'after',
                        },
                    ],
                    pathGroupsExcludedImportTypes: ['builtin'],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'variable',
                    types: ['boolean'],
                    format: ['PascalCase', 'camelCase'],
                    prefix: [
                        'is',
                        'has',
                        'should',
                        'can',
                        'must',
                        'was',
                        'will',
                    ],
                },
                {
                    selector: 'variable',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                },
                {
                    selector: 'variable',
                    modifiers: ['const'],
                    format: ['UPPER_CASE', 'camelCase'],
                    filter: {
                        regex: '^[_A-Z0-9]+$',
                        match: true,
                    },
                },
                {
                    selector: 'function',
                    format: ['PascalCase', 'camelCase'],
                },
                {
                    selector: 'class',
                    format: ['PascalCase'],
                },
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                    custom: {
                        regex: '^I[A-Z]',
                        match: true,
                    },
                },
                {
                    selector: 'typeAlias',
                    format: ['PascalCase'],
                },
                {
                    selector: 'typeParameter',
                    format: ['PascalCase'],
                    prefix: ['T'],
                },
            ],
        },
    },
]
