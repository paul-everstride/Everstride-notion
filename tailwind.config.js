/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#ffffff",
        surface: "#fbfbfa",
        surfaceStrong: "#f1f1ef",
        line: "#e9e9e7",
        ink: "#37352f",
        muted: "#9b9a97",
        brand: "#e16b2b",
        brandInk: "#c45e20",
        brandSoft: "#fdf3ed",
        blue: "#3b82f6",
        blueSoft: "#eff6ff",
        success: "#059669",
        successSoft: "#ecfdf5",
        warning: "#d97706",
        warningSoft: "#fffbeb",
        danger: "#dc2626",
        dangerSoft: "#fef2f2"
      }
    }
  },
  plugins: []
};
