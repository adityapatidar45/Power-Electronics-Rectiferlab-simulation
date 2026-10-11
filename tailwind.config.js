/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        scope: {
          bg: '#0a0e17',
          panel: '#111827',
          border: '#1f2937',
          grid: '#1e293b',
          ch1: '#38bdf8', // Blue (source)
          ch2: '#4ade80', // Green (output voltage)
          ch3: '#fbbf24', // Amber (load current)
          ch4: '#f43f5e', // Rose (gate pulse / device voltage)
          ch5: '#a855f7', // Purple (inductor voltage)
          ch6: '#ec4899', // Pink (source current)
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
