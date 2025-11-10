/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Studio McGee inspired neutral palette
        'warm-white': '#FAFAF8',
        'pure-white': '#FFFFFF',
        'soft-black': '#2D2D2D',
        'warm-gray': '#6B6B6B',
        'warm-taupe': '#8B7355',
        'muted-sage': '#5F7161',
        'barely-beige': '#E8E6E3',
        'light-cream': '#F5F4F1',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'serif'],
      },
      borderRadius: {
        'none': '0px', // Sharp corners everywhere - your preference!
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 4px 16px rgba(0, 0, 0, 0.06)',
        'soft-xl': '0 8px 24px rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
      },
    },
  },
  plugins: [],
}