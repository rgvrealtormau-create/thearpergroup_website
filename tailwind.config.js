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
        // Cedar Ridge Reserve — its own brand, scoped to the /communities/cedar-ridge-reserve page.
        crnavy: '#1F3044',
        crbrass: '#B68A4C',
        crivory: '#F8F5EE',
        crslate: '#5D6770',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        display: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        crserif: ['var(--font-cr-display)', 'Georgia', 'serif'],
        crsans: ['var(--font-cr-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: { content: '68rem' },
    },
  },
  plugins: [],
};
