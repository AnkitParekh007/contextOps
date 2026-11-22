import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Arial", "Helvetica", "sans-serif"] },
      colors: {
        ink: "#10242c",
        brand: "#0b7269",
        canvas: "#f4f7f6",
        soft: "#eaf3f1"
      },
      boxShadow: { float: "0 24px 64px rgba(7,49,52,.09)" }
    }
  },
  plugins: []
} satisfies Config;
