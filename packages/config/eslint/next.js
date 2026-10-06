// ESLint rules for the Next.js app (base rules + Next.js rules).
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';
import base from './base.js';

export default [
  ...base,
  {
    plugins: { '@next/next': nextPlugin },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
