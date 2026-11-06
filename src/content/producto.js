// Textos del juego y datos de la marca.
//
// Regla de redacción: las afirmaciones sobre el producto siempre se atribuyen a su ficha o
// prospecto. No escribir que cura, elimina virus ni garantiza prevenir infecciones.

import fotoProducto from '@/assets/marca/echinacea-medica.webp';
import logoInti from '@/assets/marca/inti-logo.webp';

export const MENSAJES_CLIMA = [
  {
    icono: '☁️',
    etapa: 'Nublado',
    texto: 'Conoce el apoyo a las defensas descrito en la ficha del producto',
  },
  {
    icono: '🌧️',
    etapa: 'Lluvia',
    texto: 'Una opción que el fabricante presenta para los cambios de estación',
  },
  {
    icono: '❄️',
    etapa: 'Nieve',
    texto: 'Consulta su uso complementario para el resfrío común en el prospecto',
  },
];

export const FRASE_PRESENTADOR = 'Mira cómo Echi acompaña al personaje durante los cambios de clima';

// Aviso en la pantalla de resultado.
export const AVISO_FANTASIA_CORTO = 'Juego de fantasía: no representa el efecto del producto.';

export const PRODUCTO = {
  nombre: 'Echinacea Médica',
  // Foto real del frasco y la caja (fondo transparente, en WebP para que pese poco). Para cambiarla,
  // reemplaza el archivo en src/assets/marca/. Con null se muestra la ilustración del frasco.
  imagenFrasco: fotoProducto,
  // Dónde está el frasco dentro de esa foto (en píxeles), para el frasco gigante que aparece junto
  // al camino. Si cambias la foto, actualiza el recorte o pon null para usar el frasco ilustrado.
  recorteFrasco: { x: 0, y: 64, w: 189, h: 493 },
  distribuidor: 'INTI',
  logoDistribuidor: logoInti,
};
