/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0b0f',
        panelBg: '#121217',
        borderMuted: 'rgba(255, 255, 255, 0.08)',
        accentPrimary: '#6366f1',
      }
    },
  },
  plugins: [],
}
