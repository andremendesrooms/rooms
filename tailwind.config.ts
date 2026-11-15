import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14213D', // navy — headers, texto principal, confiança
        paper: '#F1F3F5', // fundo claro, tom frio (não o bege genérico)
        route: {
          gold: '#C98A2C', // destaque principal — CTAs, preços, badges
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
