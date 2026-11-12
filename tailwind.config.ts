import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#101B35",
        deep: "#17294B",
        teal: "#16D6B2",
        brightTeal: "#0FC7A6",
        bg: "#F7F9FC",
        surface: "#FFFFFF",
        mutedSurface: "#EEF2F7",
        border: "#E4E9F1",
        primaryText: "#172033",
        secondaryText: "#64748B",
        success: "#16A36A",
        warning: "#E7A23B",
        error: "#DC5353",
        info: "#3985DB",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(16, 27, 53, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
