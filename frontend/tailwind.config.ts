import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic variables
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        highlight: "var(--highlight)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",

        // Exact Master Palette Tokens
        merino: "#F5EEDD",
        "rock-blue": "#84B3CE",
        "venice-blue": "#16587B",
        "deep-teal": "#104763",
        "dark-navy": "#163A50",
        "pale-blue": "#E6F0F5",
        "light-blue": "#D5E6EF",
        "pure-white": "#FFFFFF",
        "muted-cream": "#FAF7EF",

        "primary-text": "#173A4A",
        "secondary-text": "#496775",
        "muted-text": "#6E8792",
      },
      borderRadius: {
        DEFAULT: "12px",
        sm: "10px",
        md: "14px",
        lg: "18px",
        xl: "24px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        subtle: "0 2px 8px 0 rgba(23, 58, 74, 0.04)",
        card: "0 4px 20px -2px rgba(23, 58, 74, 0.06)",
        float: "0 12px 32px -4px rgba(23, 58, 74, 0.08)",
        ring: "0 0 0 3px rgba(132, 179, 206, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
