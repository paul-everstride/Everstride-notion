/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#070809",
        surface: "#0c0e11",
        surfaceStrong: "#101316",
        line: "#1c2028",
        ink: "#c4b590",
        muted: "#4e4840",
        brand: "#ff6b2b",
        brandInk: "#e8400c",
        brandSoft: "#180d07",
        blue: "#38bdf8",
        blueSoft: "#071219",
        success: "#4ade80",
        successSoft: "#071a0d",
        warning: "#fbbf24",
        warningSoft: "#181406",
        danger: "#f87171",
        dangerSoft: "#190707"
      },
      fontFamily: {
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"]
      },
      transitionTimingFunction: {
        standard: "ease"
      }
    }
  },
  plugins: []
};
