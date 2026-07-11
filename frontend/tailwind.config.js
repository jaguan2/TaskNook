/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Cozy "Virtual Cottage" palette
        night: "#2b1830",
        plum: "#3b1f33",
        wine: "#4a2238",
        rose: "#d98a93",
        blush: "#e8a3a8",
        petal: "#f3c6c0",
        cream: "#f7e9e2",
        glow: "#ffe9b0",
        amber: "#e8b04b",
        sky: "#3a2f5e",
        sage: "#7faf8f",
      },
      fontFamily: {
        cozy: ['"Quicksand"', "ui-rounded", "system-ui", "sans-serif"],
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
