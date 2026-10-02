import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gh: {
          bg: '#0d1117',
          card: '#161b22',
          subtle: '#21262d',
          border: '#30363d',
          text: '#c9d1d9',
          muted: '#8b949e',
          accent: '#238636',
          accentHover: '#2ea043',
          blue: '#58a6ff',
          warning: '#d29922',
          danger: '#f85149',
          purple: '#bc8cff',
        },
      },
    },
  },
  plugins: [],
};

export default config;
