/** @type {import('tailwindcss').Config} */

// Rediseño "libro contable acromático": el cromo no lleva color. La tinta casi negra hace de
// acento (botón principal, pestaña activa), el azul de datos marca el dato principal de cada
// gráfica y verde/rojo solo dicen si una cifra va bien o mal.
//
// En vez de reescribir cientos de clases, las familias de color que se usaban como decoración
// se remapean aquí: `orange` (el antiguo acento) pasa a tinta, y violeta/cielo/teal/índigo a
// grises. `slate` pasa a grises neutros para quitar el tinte azulado.

const ink = {
  50: '#f4f4f4',
  100: '#ececec',
  200: '#dedede',
  300: '#c4c4c4',
  400: '#8a8a8a',
  500: '#141414',
  600: '#141414',
  700: '#0a0a0a',
  800: '#0a0a0a',
  900: '#0a0a0a',
  950: '#000000',
};

const neutral = {
  50: '#f7f7f7',
  100: '#f0f0f0',
  200: '#e6e6e6',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#5c5c5c',
  700: '#3d3d3d',
  800: '#262626',
  900: '#0a0a0a',
  950: '#050505',
};

// Gris para las familias decorativas: los chips de colores pasan a ser neutros
const quiet = {
  50: '#f4f4f4',
  100: '#ececec',
  200: '#e0e0e0',
  300: '#c8c8c8',
  400: '#9a9a9a',
  500: '#6b6b6b',
  600: '#3d3d3d',
  700: '#262626',
  800: '#1a1a1a',
  900: '#0a0a0a',
  950: '#050505',
};

// Verde de "va bien": más oscuro que el emerald por defecto para llegar a 4,5:1 como texto
const positive = {
  50: '#eef8f1',
  100: '#dcfae5',
  200: '#bfe8cc',
  300: '#8fd1a6',
  400: '#4fae74',
  500: '#2e7d32',
  600: '#247b50',
  700: '#1d6b44',
  800: '#04250e',
  900: '#04250e',
  950: '#021a09',
};

// Rojo de "va mal"
const negative = {
  50: '#fff5f3',
  100: '#ffedea',
  200: '#fcd3cd',
  300: '#f5a59b',
  400: '#e5665a',
  500: '#c4242a',
  600: '#c4242a',
  700: '#a51d22',
  800: '#831c1e',
  900: '#5c1214',
  950: '#3d0c0d',
};

// Azul de datos: el dato principal de cada gráfica (no se usa en el cromo)
const data = {
  50: '#eef3fb',
  100: '#dce7f7',
  200: '#b9cfee',
  300: '#8aafe0',
  400: '#4f86d0',
  500: '#1d5fbf',
  600: '#1d5fbf',
  700: '#174d9b',
  800: '#123b77',
  900: '#0c2952',
  950: '#081a35',
};

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        orange: ink,
        slate: neutral,
        gray: neutral,
        violet: quiet,
        purple: quiet,
        indigo: quiet,
        sky: quiet,
        teal: quiet,
        cyan: quiet,
        emerald: positive,
        green: positive,
        rose: negative,
        red: negative,
        data,
        ground: '#f2f4f7',
      },
    },
  },
  plugins: [],
};
