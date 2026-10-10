import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        midnight: {
          DEFAULT: '#14213D',
          dark: '#0E172B',
          surface: '#1C2D52',
          border: 'rgba(255, 255, 255, 0.12)',
        },
        canvas: '#F5F7FB',
        card: '#FFFFFF',
        'text-main': '#1E293B',
        'text-muted': '#64748B',
        accent: {
          emerald: '#10B981',
          sky: '#38BDF8',
        },
        aqi: {
          good: '#10B981',
          moderate: '#F59E0B',
          unhealthy_sensitive: '#F97316',
          unhealthy: '#EF4444',
          very_unhealthy: '#8B5CF6',
          hazardous: '#881337',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(20, 33, 61, 0.08), 0 8px 10px -6px rgba(20, 33, 61, 0.04)',
        'card-elevated': '0 8px 24px -4px rgba(20, 33, 61, 0.08), 0 2px 6px -2px rgba(20, 33, 61, 0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
export default config
