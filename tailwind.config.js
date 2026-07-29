/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    'bg-laterite', 'bg-indigo', 'bg-soleil', 'bg-jade', 'bg-lagune',
    'text-laterite', 'text-indigo', 'text-soleil', 'text-jade', 'text-lagune',
    'before:bg-laterite', 'before:bg-indigo', 'before:bg-soleil', 'before:bg-jade', 'before:bg-lagune',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      colors: {
        // Neutres chauds
        ink: '#221a16',
        paper: '#fdf6ee',
        card: '#ffffff',
        muted: '#7a6f68',
        line: '#ece3d8',
        'line-strong': '#dccfc0',
        'muted-bg': '#f7efe6',

        // Palette vivante — terre, soleil, plan technique
        indigo: { DEFAULT: '#1e2a78', deep: '#141d52', soft: '#eaecf9' },
        laterite: { DEFAULT: '#e0532f', deep: '#c0391b', soft: '#fdeee9' },
        soleil: { DEFAULT: '#f6a823', deep: '#d98a08', soft: '#fef4df' },
        jade: { DEFAULT: '#0fa36b', deep: '#0a7d51', soft: '#e3f7ee' },
        lagune: { DEFAULT: '#17b3c7', deep: '#0e8a99', soft: '#e1f6f9' },
        ok: '#0fa36b',
      },
      borderRadius: {
        xl2: '16px',
        xl3: '22px',
      },
      boxShadow: {
        soft: '0 1px 4px 0 rgba(34,26,22,0.07)',
        card: '0 6px 22px -10px rgba(34,26,22,0.18)',
        glow: '0 14px 40px -16px rgba(30,42,120,0.45)',
        'glow-lat': '0 14px 40px -16px rgba(224,83,47,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-18px) rotate(6deg)' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(22px) rotate(-5deg)' },
        },
        drift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        pop: {
          '0%': { transform: 'scale(0.82)', opacity: '0.4' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(15,163,107,0.45)' },
          '70%': { boxShadow: '0 0 0 9px rgba(15,163,107,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(15,163,107,0)' },
        },
        'grid-pan': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '46px 46px' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.7s ease both',
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        drift: 'drift 14s ease infinite',
        shimmer: 'shimmer 2.6s ease-in-out infinite',
        pop: 'pop 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'grid-pan': 'grid-pan 8s linear infinite',
      },
    },
  },
  plugins: [],
}
