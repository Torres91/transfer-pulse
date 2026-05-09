import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // TransferPulse palette — dark navy stadium feel
        bg: {
          primary:   '#050b14',
          card:      '#0d1b2a',
          cardHover: '#112236',
          border:    '#1a2f45',
          input:     '#0a1525',
        },
        accent: {
          green:  '#00e096',
          amber:  '#fbbf24',
          red:    '#f43f5e',
          blue:   '#3b82f6',
        },
        text: {
          primary:   '#f0f9ff',
          secondary: '#94a3b8',
          muted:     '#475569',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':    'slideIn 0.2s ease-out',
        'fade-in':     'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
