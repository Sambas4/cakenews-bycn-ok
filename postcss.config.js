/**
 * PostCSS pipeline picked up automatically by Vite.
 * Tailwind generates the utility CSS, autoprefixer adds vendor
 * prefixes for the few CSS properties our supported browser matrix
 * still needs them on (mostly `-webkit-` Safari quirks).
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
