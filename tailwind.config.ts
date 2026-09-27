import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0d12",
          900: "#10131b",
          800: "#171c27",
          700: "#232a3a",
          600: "#33405a",
        },
        accent: {
          DEFAULT: "#7c6cf0",
          soft: "#a79df7",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
