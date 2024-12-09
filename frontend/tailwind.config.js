/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontSize: {
        '2xs': '0.625rem', // 10px
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
