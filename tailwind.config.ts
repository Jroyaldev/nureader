import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary Design System Colors
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        'background-secondary': 'rgb(var(--background-secondary) / <alpha-value>)',
        'background-tertiary': 'rgb(var(--background-tertiary) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        'foreground-secondary': 'rgb(var(--foreground-secondary) / <alpha-value>)',
        'foreground-muted': 'rgb(var(--foreground-muted) / <alpha-value>)',
        
        // Glass Morphism Colors
        'glass-bg': 'rgb(var(--glass-bg) / <alpha-value>)',
        'glass-bg-secondary': 'rgb(var(--glass-bg-secondary) / <alpha-value>)',
        'glass-border': 'rgb(var(--glass-border) / <alpha-value>)',
        
        // Brand Colors
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          light: 'rgb(var(--primary-light) / <alpha-value>)',
          dark: 'rgb(var(--primary-dark) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        
        // Accent Colors
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        
        // Semantic Colors
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
        
        // Reading Theme Colors
        'reading-bg': 'rgb(var(--reading-bg) / <alpha-value>)',
        'reading-foreground': 'rgb(var(--reading-foreground) / <alpha-value>)',
        'sepia-bg': 'rgb(var(--sepia-bg) / <alpha-value>)',
        'sepia-foreground': 'rgb(var(--sepia-foreground) / <alpha-value>)',
        
        // UI Element Colors
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        
        // Interactive States
        'hover-overlay': 'rgb(var(--hover-overlay))',
        'active-overlay': 'rgb(var(--active-overlay))',
        'focus-ring': 'rgb(var(--focus-ring))',
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        reading: ['Charter', 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'monospace'],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
        '7xl': ['4.5rem', { lineHeight: '1.1' }],
        '8xl': ['6rem', { lineHeight: '1.1' }],
        '9xl': ['8rem', { lineHeight: '1.1' }],
      },
      
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
      
      boxShadow: {
        'glass': 'var(--shadow-glass)',
        'glass-lg': 'var(--shadow-glass-lg)',
        'premium': '0 4px 24px rgb(0 0 0 / 0.1)',
        'premium-lg': '0 8px 40px rgb(0 0 0 / 0.12)',
        'premium-xl': '0 20px 80px rgb(0 0 0 / 0.15)',
      },
      
      borderRadius: {
        'none': '0',
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        'full': '9999px',
      },
      
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      
      animation: {
        'gentle-bounce': 'gentle-bounce 2s ease-in-out infinite',
        'subtle-pulse': 'subtle-pulse 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
      },
      
      keyframes: {
        'gentle-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'subtle-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'rgb(var(--foreground))',
            '--tw-prose-headings': 'rgb(var(--foreground))',
            '--tw-prose-links': 'rgb(var(--primary))',
            '--tw-prose-body': 'rgb(var(--foreground-secondary))',
            '--tw-prose-bold': 'rgb(var(--foreground))',
            '--tw-prose-counters': 'rgb(var(--foreground-muted))',
            '--tw-prose-bullets': 'rgb(var(--foreground-muted))',
            '--tw-prose-hr': 'rgb(var(--border))',
            '--tw-prose-quotes': 'rgb(var(--foreground))',
            '--tw-prose-quote-borders': 'rgb(var(--border))',
            '--tw-prose-captions': 'rgb(var(--foreground-muted))',
            '--tw-prose-code': 'rgb(var(--foreground))',
            '--tw-prose-pre-code': 'rgb(var(--foreground-secondary))',
            '--tw-prose-pre-bg': 'rgb(var(--muted))',
            '--tw-prose-th-borders': 'rgb(var(--border))',
            '--tw-prose-td-borders': 'rgb(var(--border))',
            h1: {
              fontWeight: '600',
              letterSpacing: '-0.025em',
              lineHeight: '1.1',
            },
            h2: {
              fontWeight: '600',
              letterSpacing: '-0.02em',
              lineHeight: '1.2',
            },
            h3: {
              fontWeight: '600',
              letterSpacing: '-0.015em',
              lineHeight: '1.25',
            },
            h4: {
              fontWeight: '600',
              letterSpacing: '-0.01em',
              lineHeight: '1.3',
            },
            p: {
              lineHeight: '1.7',
            },
            blockquote: {
              fontStyle: 'italic',
              borderLeftColor: 'rgb(var(--primary) / 0.3)',
              borderLeftWidth: '4px',
            },
          },
        },
        'reading': {
          css: {
            fontFamily: 'Charter, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif',
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            lineHeight: '1.7',
            maxWidth: '65ch',
            p: {
              marginBottom: '1.5rem',
              textAlign: 'justify',
              hyphens: 'auto',
            },
          },
        },
      },
      
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
} satisfies Config;

export default config;
