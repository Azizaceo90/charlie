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
        // Light, monochrome SaaS palette.
        bg: {
          DEFAULT: "#f6f6f7", // app canvas
          soft: "#f2f2f4", // subtle tiles / inputs / tracks
          card: "#ffffff", // cards, sidebar, surfaces
          hover: "#ececef", // hover states
        },
        line: "#e5e5e8",
        // "brand" = the black accent used for primary actions and emphasis.
        brand: {
          DEFAULT: "#111113",
          soft: "#27272a",
          dim: "#000000",
        },
        // Kept for API compatibility; mapped to neutral grays for a B&W theme.
        accent: {
          green: "#3f3f46",
          amber: "#52525b",
          blue: "#3f3f46",
          purple: "#52525b",
          red: "#3f3f46",
          teal: "#3f3f46",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        pop: "0 10px 30px rgba(16,24,40,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
