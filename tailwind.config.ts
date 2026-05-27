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
        // monday.com-inspired: bright, colorful, light surfaces.
        bg: {
          DEFAULT: "#f6f7fb", // app canvas
          soft: "#eceef5", // tiles / inputs / tracks
          card: "#ffffff", // cards, sidebar, surfaces
          hover: "#eef0f7", // hover states
        },
        line: "#e0e3ee",
        // "brand" = monday blue, used for primary actions and emphasis.
        brand: {
          DEFAULT: "#0073ea",
          soft: "#0073ea",
          dim: "#0060b9",
        },
        // Vibrant status palette (monday color language).
        accent: {
          green: "#00c875",
          amber: "#fdab3d",
          blue: "#579bfc",
          purple: "#a25ddc",
          red: "#e2445c",
          teal: "#00d2d2",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Figtree", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)",
        pop: "0 12px 32px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
