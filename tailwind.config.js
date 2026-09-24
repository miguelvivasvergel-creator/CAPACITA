import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      },
      boxShadow: {
        'soft': '0 2px 20px -2px rgba(0, 0, 0, 0.04), 0 12px 32px -4px rgba(37, 99, 235, 0.06)',
        'card': '0 20px 40px -15px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.02)',
        'glass-deep': '0 24px 60px -12px rgba(0, 15, 50, 0.45), inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)',
      }
    },
  },
  plugins: [forms],
}
