import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Primary serif — Adobe Garamond Pro (commercial) with EB Garamond
        // as the open-source web fallback (same Claude Garamont specimen).
        display: ['"Adobe Garamond Pro"', '"EB Garamond"', "Garamond", "Georgia", "Times New Roman", "serif"],
        // Secondary sans for titles — Manrope (Google Fonts, Arboria-style).
        title: ['"Manrope"', "system-ui", "-apple-system", "sans-serif"],
        // Body text — Inter (Google Fonts, Acumin Pro-style).
        body: ['"Inter"', '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        // Label / tag typeface — Montserrat geometric sans (replaces DM Mono).
        mono: ['"Montserrat"', "system-ui", "-apple-system", "sans-serif"],
        // Wordmark — Instrument Serif italic.
        logo: ['"Instrument Serif"', "Times New Roman", "serif"],
        // Legacy narrative aliases re-mapped to the current system.
        garamond: ['"Adobe Garamond Pro"', '"EB Garamond"', "Garamond", "Georgia", "serif"],
        grotesk: ['"Manrope"', "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        ink: {
          DEFAULT: "hsl(var(--ink))",
          soft: "hsl(var(--ink-soft))",
          muted: "hsl(var(--ink-soft))",
          faint: "hsl(var(--warm-gray))",
        },
        paper: {
          DEFAULT: "hsl(var(--paper))",
          warm: "hsl(var(--paper-warm))",
          mid: "hsl(var(--paper-mid))",
        },
        "warm-gray": "hsl(var(--warm-gray))",
        "off-white": "hsl(var(--paper-warm))",
        "warm-white": "hsl(var(--paper-warm))",
        stone: "hsl(var(--paper-mid))",
        terracotta: {
          DEFAULT: "hsl(var(--accent))",
          light: "hsl(var(--accent-light))",
        },
        // legacy alias — components still importing `blue` get terracotta
        blue: {
          DEFAULT: "hsl(var(--accent))",
          light: "hsl(var(--accent-light))",
          muted: "hsl(var(--blue-muted))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent-default))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "0px",
        md: "0px",
        sm: "0px",
      },
      letterSpacing: {
        editorial: "-0.02em",
        ui: "0.03em",
        tag: "0.18em",
        label: "0.28em",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 600ms ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
