import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0f1a",
          soft: "#0f1524",
          card: "#141b2d",
          hover: "#1b2440",
        },
        line: "#232c44",
        brand: {
          DEFAULT: "#6366f1",
          soft: "#818cf8",
          dim: "#4338ca",
        },
        accent: {
          green: "#22c55e",
          amber: "#f59e0b",
          blue: "#3b82f6",
          purple: "#a855f7",
          red: "#ef4444",
          teal: "#14b8a6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
