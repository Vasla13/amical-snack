/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // Important pour le toggle manuel
  theme: {
    extend: {
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "bounce-short": "bounce 0.5s infinite",
      },
    },
  },
  plugins: [],
};
