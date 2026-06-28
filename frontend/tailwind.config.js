/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#34d399',   // Emerald 400 — Pastel Green
          light: '#6ee7b7',     // Hover state del primary
          dark: '#059669',      // Active state del primary
        },
        secondary: {
          DEFAULT: '#854d0e',   // Yellow 700 — Acentos
          light: '#6b5344',     // Hover state del secundario
          dark: '#2e2018',      // Active state del secundario
        },
        surface: '#ffffff',     // Blanco puro — tarjetas, modales
        background: '#f8f9fa',  // Fondo base de la app
        'text-primary': '#111827',  // Negro profundo — tipografía
        danger: {
          DEFAULT: '#dc2626',   // Rojo alerta — errores, alertas críticas
          light: '#ef4444',     // Hover state del danger
          dark: '#b91c1c',      // Active state del danger
        },
      },
      fontFamily: {
        // Tipografía: Inter para legibilidad en campo
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // Sistema de radios consistente
        'brand': '8px',
        'brand-lg': '12px',
        'brand-xl': '16px',
      },
    },
  },
  plugins: [],
}
