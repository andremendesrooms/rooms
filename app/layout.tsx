import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif, IBM_Plex_Mono } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const display = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'André Mendes Rooms — Imóveis em Londres para brasileiros',
  description:
    'Catálogo de quartos, studios, flats e casas para alugar em Londres, feito para brasileiros.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} ${display.variable} ${mono.variable} bg-paper font-sans text-ink`}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
