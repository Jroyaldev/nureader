import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        border: 'rgb(var(--border) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
          50: '#F5F7FF',
          100: '#EBEFFF',
          200: '#D6DFFF',
          300: '#B3C3FF',
          400: '#809CFF',
          500: '#4D75FF',
          600: '#1A4DFF',
          700: '#0033E6',
          800: '#0026B3',
          900: '#001A80',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        neutral: {
          50: '#F5F5F7',
          100: '#E3E3E8',
          200: '#C7C7CF',
          300: '#A9A9B6',
          400: '#8C8C9D',
          500: '#6E6E84',
          600: '#51516A',
          700: '#343450',
          800: '#1C1C2E',
          900: '#0F0F1A',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#1C1C2E',
            '--tw-prose-headings': '#1C1C2E',
            '--tw-prose-links': '#4D75FF',
            h1: {
              fontWeight: '600',
              letterSpacing: '-0.025em',
            },
            h2: {
              fontWeight: '600',
              letterSpacing: '-0.025em',
            },
            h3: {
              fontWeight: '600',
              letterSpacing: '-0.025em',
            },
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} satisfies Config;

export default config;
