/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 40px rgba(37, 99, 235, 0.25)",
        emerald: "0 0 40px rgba(34, 197, 94, 0.28)",
        danger: "0 0 40px rgba(239, 68, 68, 0.25)"
      },
      backgroundImage: {
        "grid-dark": "linear-gradient(rgba(148,163,184,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.08) 1px, transparent 1px)",
        "radial-blue": "radial-gradient(circle at 20% 20%, rgba(37,99,235,.36), transparent 34%), radial-gradient(circle at 80% 0%, rgba(124,58,237,.25), transparent 28%), radial-gradient(circle at 80% 85%, rgba(20,184,166,.16), transparent 32%)"
      }
    }
  },
  plugins: []
};
