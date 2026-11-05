// Textos del juego y de la sección «Conoce el producto».
//
// IMPORTANTE: el resumen del prospecto es un texto de referencia redactado con precauciones
// generales de los productos con equinácea. Antes de publicar, reemplácelo o valídelo con el
// texto aprobado del prospecto oficial de Echinacea Médica (composición, dosis, edades,
// contraindicaciones y advertencias exactas).
//
// Regla de redacción: las afirmaciones sobre el producto siempre se atribuyen a su ficha o
// prospecto. No escribir que cura, elimina virus ni garantiza prevenir infecciones.

import fotoProducto from '@/assets/marca/echinacea-medica.png';
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

export const AVISO_FANTASIA =
  'Juego de fantasía: las criaturas y el escudo de pétalos son elementos lúdicos y no representan el efecto del producto.';

// Versión breve para la pantalla de resultado (el texto completo está en «Conoce el producto»).
export const AVISO_FANTASIA_CORTO = 'Juego de fantasía: no representa el efecto del producto.';

export const PRODUCTO = {
  nombre: 'Echinacea Médica',
  // Foto real del frasco y la caja (fondo transparente). Para cambiarla, reemplaza el archivo
  // en src/assets/marca/. Con null se muestra la ilustración del frasco.
  imagenFrasco: fotoProducto,
  // Dónde está el frasco dentro de esa foto (en píxeles), para el frasco gigante que aparece junto
  // al camino. Si cambias la foto, actualiza el recorte o pon null para usar el frasco ilustrado.
  recorteFrasco: { x: 0, y: 64, w: 189, h: 493 },
  distribuidor: 'INTI',
  logoDistribuidor: logoInti,
  bajada: 'Extracto de Echinacea purpurea',
  secciones: [
    {
      titulo: 'Lo que dice su ficha',
      abierta: true,
      puntos: [
        'Su ficha describe el apoyo a las defensas del organismo.',
        'El fabricante lo presenta como una opción para los cambios de estación.',
        'Su prospecto describe su uso complementario en el resfrío común.',
      ],
    },
    {
      titulo: 'Cómo se usa',
      puntos: [
        'Sigue la dosis, la forma de uso y la duración indicadas en el prospecto o por tu médico o farmacéutico.',
        'No superes la dosis recomendada ni el tiempo de uso indicado.',
        'En niños, úsalo solo en las edades y dosis que indique el prospecto.',
      ],
    },
    {
      titulo: 'Precauciones',
      puntos: [
        'No lo uses si tienes alergia a la equinácea o a plantas de la familia de las margaritas (Asteráceas o Compuestas).',
        'Si tienes una enfermedad autoinmune, una enfermedad sistémica progresiva, defensas disminuidas o recibes tratamiento inmunosupresor, consulta a tu médico antes de usarlo.',
        'Embarazo y lactancia: consulta a tu médico antes de usarlo.',
        'Si notas una reacción alérgica (erupción, picazón o dificultad para respirar), deja de usarlo y busca atención médica.',
        'Si los síntomas empeoran, aparece fiebre alta o no mejoras en pocos días, consulta a tu médico.',
      ],
    },
  ],
  pie: 'Resumen informativo. Lee el prospecto completo incluido en el envase antes de usar el producto; ese texto es el que prevalece. Ante cualquier duda, consulta a tu médico o farmacéutico.',
};
