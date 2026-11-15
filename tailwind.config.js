/** @type {import('tailwindcss').Config} */
// Paleta de la marca: blanco, negro y gris (SRS §3). Fuentes cargadas en src/app/_layout.tsx.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#111111',
        secondary: {
          DEFAULT: '#6B6B6B',
          100: '#9A9A9A',
          200: '#3A3A3A',
        },
        fondo: '#FFFFFF',
        borde: '#E4E4E4',
        peligro: '#B91C1C',
      },
      fontFamily: {
        titulo: ['ArchivoBlack', 'sans-serif'],
        texto: ['Oswald', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
