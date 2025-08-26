import type { Config } from 'tailwindcss';

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C9AFF',
          foreground: '#0F172A',
        },
        accent: '#FBCFE8',
        muted: '#E5E7EB',
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};

export default preset;
