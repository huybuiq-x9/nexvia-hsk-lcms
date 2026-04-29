/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hsk: {
          red: '#DC2626',
          'red-light': '#FEE2E2',
          'red-dark': '#991B1B',
          1: '#DC2626',
          2: '#EA580C',
          3: '#CA8A04',
          4: '#16A34A',
          5: '#0891B2',
          6: '#4F46E5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
