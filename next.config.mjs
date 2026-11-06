// Con ECHI_EXPORT=1 (lo usa `npm run apk`) el juego se exporta como archivos estáticos en out/,
// que la app de Android lleva adentro para funcionar sin internet.
const exportStatic = process.env.ECHI_EXPORT === '1';

/** @type {import('next').NextConfig} */
const nextConfig = exportStatic
  ? {
      output: 'export',
      // Sin servidor no hay optimizador de imágenes: se usan los archivos tal cual.
      images: { unoptimized: true },
      // La exportación estática no admite el prerenderizado parcial que activan estas dos opciones;
      // el juego es una sola página que corre en el navegador y no las necesita.
      cacheComponents: false,
      partialPrefetching: false,
    }
  : {
      cacheComponents: true,
      partialPrefetching: true,
    };

export default nextConfig;
