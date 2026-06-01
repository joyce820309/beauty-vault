/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   'var(--color-primary)',
        'primary-light': 'var(--color-primary-light)',
        'primary-dark':  'var(--color-primary-dark)',
        accent:    'var(--color-accent)',
        'accent-light':  'var(--color-accent-light)',
        'app-bg':  'var(--color-bg)',
        'app-card':'var(--color-bg-card)',
        'app-muted':'var(--color-bg-muted)',
        'app-text': 'var(--color-text)',
        'app-muted-text': 'var(--color-text-muted)',
        'app-border': 'var(--color-border)',
        danger:  'var(--color-danger)',
        warning: 'var(--color-warning)',
        caution: 'var(--color-caution)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Noto Sans TC', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease',
      },
    },
  },
  plugins: [],
}
