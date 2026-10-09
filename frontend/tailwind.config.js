/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#F3F5F9',
        panel: '#FFFFFF',
        brand: {
          50: '#EEF0FF',
          100: '#E0E3FF',
          200: '#C7CCFF',
          300: '#A5ADFF',
          400: '#7E88FB',
          500: '#4F46E5',
          600: '#4545F0',
          700: '#3A38C9',
          800: '#2D2BA0',
          900: '#232178',
        },
        ink: '#0F172A',
        muted: '#6B7280',
        line: '#E5E7EB',
      },
      borderRadius: {
        card: '20px',
        panel: '16px',
        inner: '12px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(15,23,42,0.08), 0 2px 8px -4px rgba(15,23,42,0.04)',
        card: '0 12px 40px -12px rgba(15,23,42,0.12), 0 4px 12px -4px rgba(15,23,42,0.06)',
        lift: '0 30px 60px -20px rgba(79,70,229,0.25), 0 12px 32px -12px rgba(15,23,42,0.15)',
        glow: '0 10px 30px -10px rgba(79,70,229,0.55)',
      },
      keyframes: {
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.6s ease-out both',
        'toast-in': 'toast-in 0.25s ease-out both',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spatial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};