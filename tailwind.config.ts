import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      /* ── Typefaces (Aperta Health — Australian clinical) ──
         Source Sans 3 — body copy
         Inter         — display headings, scores, UI
         JetBrains Mono — IDs, dates, numeric data            */
      fontFamily: {
        sans:    ['"Source Sans 3"', '"Source Sans Pro"', 'system-ui', 'sans-serif'],
        serif:   ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"DM Mono"', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },

      /* ── Colours (all reference CSS vars in index.css) ── */
      colors: {
        border:     "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "bg-raised": "hsl(var(--bg-raised))",
        "bg-deep":   "hsl(var(--bg-deep))",
        foreground: "hsl(var(--foreground))",
        "text-2":   "hsl(var(--text-2))",
        "text-3":   "hsl(var(--text-3))",

        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT:    "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        /* Clinical semantic palette */
        clinical: {
          green:        "hsl(var(--clinical-green))",
          "green-light": "hsl(var(--clinical-green-light))",
          "green-dark":  "hsl(var(--clinical-green-dark))",
        },
        alert: {
          red:    "hsl(var(--alert-red))",
          "red-bg": "hsl(var(--alert-red-bg))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning-amber))",
          bg:      "hsl(var(--warning-amber-bg))",
        },

        sidebar: {
          DEFAULT:             "hsl(var(--sidebar-background))",
          foreground:          "hsl(var(--sidebar-foreground))",
          primary:             "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:              "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:              "hsl(var(--sidebar-border))",
          ring:                "hsl(var(--sidebar-ring))",
        },
      },

      /* ── Border radius ─────────────────────────────────── */
      borderRadius: {
        lg:  "var(--radius)",
        md:  "calc(var(--radius) + 2px)",   /* 12px */
        sm:  "calc(var(--radius) - 4px)",   /* 6px  */
      },

      /* ── Box shadows ───────────────────────────────────── */
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
        md: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        lg: "0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)",
      },

      /* ── Keyframes ─────────────────────────────────────── */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
