import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Override the default border-radius scale per design tokens.
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      DEFAULT: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.5rem',
      '2xl': '2rem',
      '3xl': '3rem',
      full: '9999px',
    },
    extend: {
      colors: {
        // Material 3 inspired semantic palette. Defined as CSS-var consumers
        // so dark mode (or any theme swap) can be added later by overriding
        // the variables in globals.css without touching component code.
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          dim: 'rgb(var(--color-surface-dim) / <alpha-value>)',
          bright: 'rgb(var(--color-surface-bright) / <alpha-value>)',
          'container-lowest': 'rgb(var(--color-surface-container-lowest) / <alpha-value>)',
          'container-low': 'rgb(var(--color-surface-container-low) / <alpha-value>)',
          container: 'rgb(var(--color-surface-container) / <alpha-value>)',
          'container-high': 'rgb(var(--color-surface-container-high) / <alpha-value>)',
          'container-highest': 'rgb(var(--color-surface-container-highest) / <alpha-value>)',
          variant: 'rgb(var(--color-surface-variant) / <alpha-value>)',
        },
        'on-surface': {
          DEFAULT: 'rgb(var(--color-on-surface) / <alpha-value>)',
          variant: 'rgb(var(--color-on-surface-variant) / <alpha-value>)',
        },
        outline: {
          DEFAULT: 'rgb(var(--color-outline) / <alpha-value>)',
          variant: 'rgb(var(--color-outline-variant) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          container: 'rgb(var(--color-primary-container) / <alpha-value>)',
        },
        'on-primary': {
          DEFAULT: 'rgb(var(--color-on-primary) / <alpha-value>)',
          container: 'rgb(var(--color-on-primary-container) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          container: 'rgb(var(--color-secondary-container) / <alpha-value>)',
        },
        'on-secondary': {
          DEFAULT: 'rgb(var(--color-on-secondary) / <alpha-value>)',
          container: 'rgb(var(--color-on-secondary-container) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--color-tertiary) / <alpha-value>)',
          container: 'rgb(var(--color-tertiary-container) / <alpha-value>)',
        },
        'on-tertiary': {
          DEFAULT: 'rgb(var(--color-on-tertiary) / <alpha-value>)',
          container: 'rgb(var(--color-on-tertiary-container) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--color-error) / <alpha-value>)',
          container: 'rgb(var(--color-error-container) / <alpha-value>)',
        },
        'on-error': {
          DEFAULT: 'rgb(var(--color-on-error) / <alpha-value>)',
          container: 'rgb(var(--color-on-error-container) / <alpha-value>)',
        },
        // Plain accent for focus rings and hover affordances.
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
      },
      fontFamily: {
        // Display / heading face.
        display: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        // Body face (default).
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Custom scale to match the design tokens. Sizes are rem-based so they
        // scale with the global --font-scale CSS variable.
        display: ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
        headline: ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'label-caps': ['0.75rem', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }],
      },
      spacing: {
        'touch-target': '2.75rem',
        gutter: '1.5rem',
        'page-margin': '2rem',
        'card-pad': '1.5rem',
        'stack-gap': '1rem',
      },
      boxShadow: {
        // Soft ambient shadow for cards.
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        // Slightly lifted variant for active rows / hovered tiles.
        'card-hover': '0 2px 4px 0 rgb(0 0 0 / 0.06), 0 4px 8px 0 rgb(0 0 0 / 0.08)',
      },
      ringColor: {
        DEFAULT: 'rgb(var(--color-accent))',
      },
    },
  },
  plugins: [],
};

export default config;
