/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mapped to the app's CSS variable theming system ([data-theme="dark"])
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card-bg)',
        cardline: 'var(--card-border)',
        muted: 'var(--muted)',
        mutedlight: 'var(--muted-light)',
        primary: 'var(--primary)',
        primaryhover: 'var(--primary-hover)',
        secondary: 'var(--secondary)',
        secondaryhover: 'var(--secondary-hover)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        header: ['var(--font-headers)'],
      },
      keyframes: {
        cardSlideIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        panelSlideIn: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        cardSlideIn: 'cardSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        panelSlideIn: 'panelSlideIn 0.3s ease forwards',
        fadeIn: 'fadeIn 0.2s ease-in-out',
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
}
