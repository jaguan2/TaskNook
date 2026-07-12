/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Cozy "Virtual Cottage" palette. night/plum/wine/rose/blush/petal are
        // CSS variables (see :root in index.css) so a data-theme attribute can
        // swap the whole app's color scheme; cream/glow/amber/sky/sage stay
        // fixed across themes (CTA highlight + semantic priority colors).
        night: "rgb(var(--color-night) / <alpha-value>)",
        plum: "rgb(var(--color-plum) / <alpha-value>)",
        wine: "rgb(var(--color-wine) / <alpha-value>)",
        rose: "rgb(var(--color-rose) / <alpha-value>)",
        blush: "rgb(var(--color-blush) / <alpha-value>)",
        petal: "rgb(var(--color-petal) / <alpha-value>)",
        cream: "#f7e9e2",
        glow: "#ffe9b0",
        amber: "#e8b04b",
        sky: "#3a2f5e",
        sage: "#7faf8f",
      },
      fontFamily: {
        cozy: ['"Quicksand"', "ui-rounded", "system-ui", "sans-serif"],
        // The "rkive." signature mark, same face as the personal portfolio.
        mark: ['"Fredoka"', '"Quicksand"', "ui-rounded", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -10px rgba(0,0,0,0.5)",
        glow: "0 0 40px -5px rgba(255,233,176,0.45)",
      },
      keyframes: {
        flicker: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        flicker: "flicker 4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
