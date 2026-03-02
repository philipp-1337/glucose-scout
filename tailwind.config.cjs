/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif']
      },
      colors: {
        glucose: {
          low: '#66B3FF',
          inrange: '#48D597',
          high: '#FF9B62'
        }
      },
      boxShadow: {
        glass: '0 10px 35px rgba(15, 23, 42, 0.25)'
      }
    }
  },
  plugins: []
}
