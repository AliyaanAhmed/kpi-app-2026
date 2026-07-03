/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-tint': 'var(--primary-tint)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        ai: 'var(--ai)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Source Sans 3', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Source Sans 3', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 8px 18px rgb(15 23 42 / 5%)',
        card: '0 12px 30px rgb(15 23 42 / 6%)',
        premium: '0 16px 36px rgb(15 23 42 / 8%)',
        modal: '0 36px 90px rgb(15 23 42 / 24%)',
      },
    },
  },
  plugins: [],
}
