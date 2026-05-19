import type { Config } from 'tailwindcss';
import animatePlugin from 'tailwindcss-animate';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    borderRadius: {
      none: '0',
      sm: '0.5rem', // 8px
      DEFAULT: '0.625rem', // 10px
      md: '0.75rem', // 12px
      lg: '1.125rem', // 18px
      xl: '1.5rem', // 24px
      '2xl': '2rem',
      '3xl': '3rem',
      full: '9999px',
    },
    extend: {
      colors: {
        // ---- Clinical surfaces ----
        bg: {
          DEFAULT: 'rgb(var(--color-bg) / <alpha-value>)',
          deep: 'rgb(var(--color-bg-deep) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          2: 'rgb(var(--color-surface-2) / <alpha-value>)',
          // Back-compat with prior Material-3 token consumers in legacy components.
          dim: 'rgb(var(--color-surface-dim) / <alpha-value>)',
          bright: 'rgb(var(--color-surface) / <alpha-value>)',
          'container-lowest': 'rgb(var(--color-surface) / <alpha-value>)',
          'container-low': 'rgb(var(--color-surface-2) / <alpha-value>)',
          container: 'rgb(var(--color-surface-2) / <alpha-value>)',
          'container-high': 'rgb(var(--color-bg-deep) / <alpha-value>)',
          'container-highest': 'rgb(var(--color-bg-deep) / <alpha-value>)',
          variant: 'rgb(var(--color-bg-deep) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          2: 'rgb(var(--color-ink-2) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--color-muted) / <alpha-value>)',
          2: 'rgb(var(--color-muted-2) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--color-line) / <alpha-value>)',
          2: 'rgb(var(--color-line-2) / <alpha-value>)',
        },
        teal: {
          DEFAULT: 'rgb(var(--color-teal) / <alpha-value>)',
          deep: 'rgb(var(--color-teal-deep) / <alpha-value>)',
          soft: 'rgb(var(--color-teal-soft) / <alpha-value>)',
          tint: 'rgb(var(--color-teal-tint) / <alpha-value>)',
        },
        blue: {
          DEFAULT: 'rgb(var(--color-blue) / <alpha-value>)',
          soft: 'rgb(var(--color-blue-soft) / <alpha-value>)',
        },
        green: {
          DEFAULT: 'rgb(var(--color-green) / <alpha-value>)',
          soft: 'rgb(var(--color-green-soft) / <alpha-value>)',
        },
        amber: {
          DEFAULT: 'rgb(var(--color-amber) / <alpha-value>)',
          soft: 'rgb(var(--color-amber-soft) / <alpha-value>)',
        },
        red: {
          DEFAULT: 'rgb(var(--color-red) / <alpha-value>)',
          soft: 'rgb(var(--color-red-soft) / <alpha-value>)',
        },
        // ---- Semantic aliases used by legacy components ----
        'on-surface': {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          variant: 'rgb(var(--color-muted) / <alpha-value>)',
        },
        outline: {
          DEFAULT: 'rgb(var(--color-line-2) / <alpha-value>)',
          variant: 'rgb(var(--color-line) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--color-teal) / <alpha-value>)',
          container: 'rgb(var(--color-teal-soft) / <alpha-value>)',
        },
        'on-primary': {
          DEFAULT: 'rgb(255 255 255 / <alpha-value>)',
          container: 'rgb(var(--color-teal-deep) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-teal-deep) / <alpha-value>)',
          container: 'rgb(var(--color-teal-soft) / <alpha-value>)',
        },
        'on-secondary': {
          DEFAULT: 'rgb(255 255 255 / <alpha-value>)',
          container: 'rgb(var(--color-teal-deep) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--color-amber) / <alpha-value>)',
          container: 'rgb(var(--color-amber-soft) / <alpha-value>)',
        },
        'on-tertiary': {
          DEFAULT: 'rgb(255 255 255 / <alpha-value>)',
          container: 'rgb(var(--color-amber) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--color-red) / <alpha-value>)',
          container: 'rgb(var(--color-red-soft) / <alpha-value>)',
        },
        'on-error': {
          DEFAULT: 'rgb(255 255 255 / <alpha-value>)',
          container: 'rgb(var(--color-red) / <alpha-value>)',
        },
        accent: 'rgb(var(--color-teal) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-geist)', 'Geist', 'system-ui', 'sans-serif'],
        sans: ['var(--font-geist)', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', '"IBM Plex Mono"', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      fontSize: {
        display: ['2.375rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        headline: ['1.375rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        title: ['1rem', { lineHeight: '1.3', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body-lg': ['0.9375rem', { lineHeight: '1.55', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.45', fontWeight: '400' }],
        'label-caps': [
          '0.6875rem',
          { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '600' },
        ],
      },
      spacing: {
        'touch-target': '2.75rem',
        gutter: '1.5rem',
        'page-margin': '2rem',
        'card-pad': '1.25rem',
        'stack-gap': '1rem',
        sidebar: '15rem', // 240px from design
        topbar: '3.75rem', // 60px from design
      },
      boxShadow: {
        sm: '0 1px 2px rgb(15 31 42 / 0.04), 0 1px 3px rgb(15 31 42 / 0.06)',
        DEFAULT: '0 4px 10px rgb(15 31 42 / 0.06), 0 2px 4px rgb(15 31 42 / 0.04)',
        lg: '0 20px 40px rgb(15 31 42 / 0.08), 0 8px 16px rgb(15 31 42 / 0.04)',
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-hover': '0 2px 4px 0 rgb(0 0 0 / 0.06), 0 4px 8px 0 rgb(0 0 0 / 0.08)',
        glow: '0 0 60px rgb(20 184 166 / 0.45)',
      },
      ringColor: {
        DEFAULT: 'rgb(var(--color-teal))',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'orb-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'orb-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        wave: {
          '0%, 100%': { height: '30%' },
          '50%': { height: '100%' },
        },
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'msg-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-in': {
          from: { transform: 'translateY(12px) scale(0.98)', opacity: '0' },
          to: { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'toast-in': {
          from: { transform: 'translate(-50%, 16px)', opacity: '0' },
          to: { transform: 'translate(-50%, 0)', opacity: '1' },
        },
        userpulse: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
        'orb-pulse': 'orb-pulse 2.6s ease-in-out infinite',
        'orb-ring': 'orb-ring 2.6s ease-out infinite',
        wave: 'wave 1.4s ease-in-out infinite',
        typing: 'typing 1.2s ease-in-out infinite',
        'fade-in': 'fade-in 0.25s ease',
        'msg-in': 'msg-in 0.3s ease',
        'modal-in': 'modal-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'toast-in': 'toast-in 0.22s ease',
        userpulse: 'userpulse 2s ease-out infinite',
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
