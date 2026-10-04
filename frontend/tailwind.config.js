/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F7",
        surface: "#FFFFFF",
        "surface-2": "#F4F2EE",
        "surface-3": "#ECE8E1",
        line: "#E7E3DC",
        "line-strong": "#D6CFC3",
        ink: "#1A1815",
        "ink-2": "#6C6459",
        "ink-3": "#9C948A",
        match: "#15803D",
        "match-bg": "#ECF5EF",
        conflict: "#B42318",
        "conflict-bg": "#FBECEA",
        unknown: "#B45309",
        "unknown-bg": "#FAF2E6",
        na: "#A29B92",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SF Mono",
          "SFMono-Regular",
          "Cascadia Code",
          "JetBrains Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        card: "14px",
        control: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,24,21,0.05), 0 12px 32px -16px rgba(26,24,21,0.10)",
        pop: "0 2px 6px rgba(26,24,21,0.08), 0 24px 48px -24px rgba(26,24,21,0.18)",
        focus: "0 0 0 3px rgba(26,24,21,0.12)",
      },
      letterSpacing: {
        label: "0.09em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.28s cubic-bezier(0.2,0.7,0.3,1) both",
        "fade-in": "fade-in 0.2s ease both",
      },
    },
  },
  plugins: [],
};
