import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#242424', // grafite — cabeçalhos e texto principal
        paper: '#FAFAF8', // branco suave — fundo público
        route: {
          gold: '#B94414', // laranja com contraste para CTAs, preços e badges
          green: '#2F6E51', // sucesso / disponível
          red: '#B23A2E', // alerta / hot deal, usado com moderação
        },
        slate: {
          soft: '#5B6472',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
