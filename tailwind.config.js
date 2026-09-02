/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#2A2626',
        petrol: '#2B4555',
        forest: '#2A331D',
        cream: '#ECE5D7',
        paper: '#F7F3EC',
        gold: '#D7BC87',
        clay: '#946443',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: { content: '68rem' },
    },
  },
  plugins: [],
};
