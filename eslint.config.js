import path from 'node:path'
import { fileURLToPath } from 'node:url'
import config from '@tpluscode/eslint-config'
import { includeIgnoreFile } from 'eslint/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gitignorePath = path.resolve(__dirname, '.gitignore')

export default [
  includeIgnoreFile(gitignorePath),
  ...config,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['bin/*.ts'],
    rules: {
      'n/hashbang': ['error', {
        convertPath: {
          'bin/**': ['(.+)[.]ts$', '$1.js'],
        },
      }],

    },
  },
]
