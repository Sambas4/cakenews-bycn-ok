/**
 * Tailwind CSS configuration for CakeNews.
 *
 * Mirrors the CDN-time config that lived inside `<script>` in
 * index.html. Compiled locally so we can ship a strict Content
 * Security Policy and stop pulling 4 MB of JS from a CDN on every
 * cold start.
 *
 * The `content` glob lists every file Tailwind must scan to find
 * class names — Angular components inline their templates inside
 * the .ts files, so .ts is enough; .html is included for any
 * future external templates.
 */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,html}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'marquee-left': 'marquee-left 25s linear infinite',
        flash: 'flash 2s infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        'marquee-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
