import type { Config } from 'tailwindcss';
import preset from '@snaproll/config/tailwind-preset';

export default {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  safelist: [
    'gradient-1',
    'gradient-2',
    'gradient-3',
    'gradient-4',
    'gradient-5',
    'gradient-6',
    'font-futuristic',
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
