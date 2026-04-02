/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary:                   '#2d6197',
        'primary-container':       '#92c1fe',
        'primary-dim':             '#1e558b',
        surface:                   '#f7f9fc',
        'surface-bright':          '#f7f9fc',
        'surface-container-lowest':'#ffffff',
        'surface-container-low':   '#f0f4f8',
        'surface-container':       '#e9eef3',
        'surface-container-high':  '#e3e9ee',
        'on-surface':              '#2c3338',
        'on-surface-variant':      '#596065',
        'outline-variant':         '#abb3b9',
        outline:                   '#747c81',
        error:                     '#a83836',
        'error-container':         '#fa746f',
        'on-error-container':      '#6e0a12',
        secondary:                 '#49636f',
        'secondary-container':     '#cbe7f5',
      },
    },
  },
  plugins: [],
}
