import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // AionUI dark theme colors (exact values from CSS)
        bg: {
          base:   '#0e0e0e',
          1:      '#1a1a1a',
          2:      '#262626',
          3:      '#333333',
          4:      '#404040',
          hover:  '#1f1f1f',
          active: '#2d2d2d',
        },
        text: {
          primary:   '#ffffff',
          secondary: '#ced3da',
          disabled:  '#737373',
        },
        border: {
          base:  '#333333',
          light: '#262626',
        },
        primary: {
          DEFAULT: '#4d9fff',
          hover:   '#6aafff',
          dim:     'rgba(77,159,255,0.15)',
        },
        user: {
          bubble: '#1e2a3a',
        },
        // Semantic danger/success
        danger: '#f76560',
        success: '#23c343',
      },
      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'blink':    'blink 1s step-end infinite',
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.18s ease-out',
        'pulse-dot':'pulseDot 1.4s ease-in-out infinite alternate',
      },
      keyframes: {
        blink:    { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        fadeIn:   { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:  { from: { transform: 'translateX(-6px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        pulseDot: { '0%': { opacity: '0.4', transform: 'scale(0.85)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
} satisfies Config
