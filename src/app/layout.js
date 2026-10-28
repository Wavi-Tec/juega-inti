import { Baloo_2, Nunito } from 'next/font/google';
import './globals.css';

const display = Baloo_2({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Nunito({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'Echi te acompaña · Echinacea Médica',
  description:
    'Juego de 60 segundos: toca a Echi para cubrir a tu acompañante con un escudo de pétalos mientras cambia el clima.',
  appleWebApp: { capable: true, title: 'Echi te acompaña', statusBarStyle: 'default' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#E5407F',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
