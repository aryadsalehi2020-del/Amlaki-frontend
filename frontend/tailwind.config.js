/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'primary': '#7C8B6F',
        'primary-light': '#8A9A7D',
        'secondary': '#F5F0E8',
        'surface': '#FAF7F2',
        'surface-light': '#FFFFFF',
        'surface-hover': '#F5F0E8',
        'neon-blue': '#7C8B6F', 'neon-purple': '#B5A68C', 'neon-pink': '#C4B89E',
        'neon-green': '#7C8B6F', 'accent': '#7C8B6F', 'accent-light': '#8A9A7D', 'accent-dark': '#6B7A5E',
        'text-primary': '#2C2418', 'text-secondary': '#5C4F3D', 'text-muted': '#8C7E6A',
        'success': '#7C8B6F', 'warning': '#C4A35A', 'error': '#B85C5C', 'info': '#7C8B6F',
        'dark': '#2C2418', 'slate': '#5C4F3D', 'platinum': '#FAF7F2',
        // Warm palette
        'apple': {
          1: '#FAF7F2',
          2: '#F5F0E8',
          3: '#E8E0D4',
          4: '#C4B89E',
          5: '#B5A68C',
          6: '#8C7E6A',
          7: '#5C4F3D',
          8: '#2C2418',
          9: '#1A1508',
        },
        // Landing page tokens (shared across app)
        'lp-cream': '#FAF7F2',
        'lp-cream-alt': '#F5F0E8',
        'lp-khaki': { DEFAULT: '#B5A68C', light: '#C4B89E' },
        'lp-olive': { DEFAULT: '#7C8B6F', dark: '#6B7A5E' },
        'lp-heading': '#2C2418',
        'lp-body': '#5C4F3D',
        'lp-border': '#E8E0D4',
      },
      fontFamily: {
        'display': ['"Plus Jakarta Sans"', 'sans-serif'],
        'body': ['"Plus Jakarta Sans"', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '16px',
        'apple-xl': '22px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(44,36,24,0.04)',
        'card-hover': '0 8px 30px rgba(44,36,24,0.08)',
        'elevated': '0 4px 20px rgba(44,36,24,0.1)',
        'apple': '0 1px 3px rgba(44,36,24,0.06)',
      },
    },
  },
  plugins: [],
}
