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
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#f5f0ff",
          100: "#ede5ff",
          200: "#ddd0ff",
          300: "#c4abff",
          400: "#a67dff",
          500: "#8b4dff",
          600: "#7c2ef7",
          700: "#6b21e3",
          800: "#5a1cbf",
          900: "#4b199c",
        },
      },
      animation: {
        "skeleton": "skeleton 1.5s ease-in-out infinite",
        "toast-in": "toastIn 0.3s ease-out",
        "toast-out": "toastOut 0.3s ease-in forwards",
      },
      keyframes: {
        skeleton: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
        toastIn: {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        toastOut: {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
