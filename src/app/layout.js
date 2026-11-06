import localFont from 'next/font/local';
import './globals.css';

// Baloo 2 y Nunito (Google Fonts, licencia SIL Open Font License), solo con el alfabeto latino
// (incluye tildes, ñ, ¡ y ¿): así el juego no carga los otros alfabetos y pesa menos.
const display = localFont({
  src: '../assets/fonts/baloo2-latin.woff2',
  weight: '400 800',
  variable: '--font-display',
  display: 'swap',
});
const body = localFont({
  src: '../assets/fonts/nunito-latin.woff2',
  weight: '200 1000',
  variable: '--font-body',
  display: 'swap',
});

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
