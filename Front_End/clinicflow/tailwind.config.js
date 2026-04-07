/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-light": "var(--primary-light)",
        secondary: "var(--secondary)",
        "secondary-hover": "var(--secondary-hover)",
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface-variant)",
        outline: "var(--outline)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
      },

      fontFamily: {
        headline: ["Outfit", "sans-serif"],
        arabic: ["Cairo", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },

      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.125rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },

      boxShadow: {
        "glow-primary": "0 20px 40px -10px rgb(var(--primary-glow) / 0.4)",
        "glow-primary-lg": "0 25px 50px -12px rgb(var(--primary-glow) / 0.4)",
      },
    },
  },
  plugins: [],
};