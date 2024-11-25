import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		files: ['**/*.ts']
	},
	{
		ignores: ['**/node_modules', '**/dist', '**/coverage', '**/*.js']
	},
	{
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			prettier
		},

		languageOptions: {
			globals: globals.node,
			parser: tseslint.parser,
			ecmaVersion: 2022,
			sourceType: 'module'
		},

		rules: {
			'prettier/prettier': 'error',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			]
		}
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	prettierConfig
]
