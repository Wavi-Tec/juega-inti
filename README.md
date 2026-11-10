# Echi te acompaña

Juego web de 60 segundos para Echinacea Médica. Formato vertical 9:16, se juega con un dedo.
Una persona camina por un jardín junto a Echi, una equinácea. Tocar a Echi (o el botón
«Activar escudo») despliega un escudo de pétalos que hace rebotar a las criaturas.

## Ejecutar

```bash
npm install
npm run dev        # desarrollo: http://localhost:3000
npm run build      # compilación de producción
npm start          # sirve la compilación
npm test           # pruebas del motor (temporizador, etapas, puntuación, reinicio)
```

Funciona en cualquier pantalla: en un celular vertical ocupa toda la pantalla; en tablet,
laptop o monitor el jardín y el clima llenan todo el ancho y la zona de juego (personajes,
marcador y botón) queda centrada. En un celular en horizontal pide girarlo.
Para usarlo en un stand con celular, abre la página y, si el navegador lo ofrece,
«Agregar a pantalla de inicio» para verlo a pantalla completa.

## Cómo se juega

| Tiempo  | Etapa   | Qué pasa                                             |
| ------- | ------- | ---------------------------------------------------- |
| 0–20 s  | Nublado | Los primeros 10 s, solo virus comunes de uno en uno; luego aparecen veloces y pares |
| 20–40 s | Lluvia  | Más rápidos y frecuentes, grupos de hasta 3 y algún dorado |
| 40–60 s | Nieve   | Grupos de 2 a 5 casi juntos, desde arriba y los costados |

Puntos (sin multiplicadores): cada virus bloqueado suma exactamente su valor, que se ve en su insignia.

| Virus  | Puntos | Cómo se mueve                                           |
| ------ | ------ | ------------------------------------------------------- |
| Común  | 1      | Avanza parejo                                           |
| Veloz  | 2      | Pequeño y naranja; zigzaguea y acelera al final         |
| Dorado | 3      | Con corona; se detiene a medio camino, se carga y se lanza |

- Un aro se cierra sobre cada virus. Dorado (y el botón también) = ya se puede tocar y bloquea seguro;
  blanco brillante = último momento («¡Perfecto!», solo celebración). El aro siempre marca el momento
  real de llegada, aunque el virus cambie de velocidad.
- El escudo dura 0,6 s y cada bloqueo lo mantiene abierto 0,3 s más, así un toque al brillar
  bloquea el grupo entero. Recarga en 0,35 s; si se cerró sin bloquear nada («¡Espera el brillo!»),
  tarda 0,9 s y el botón se apaga: tocar antes de tiempo o sin parar no sirve. Un toque hecho en
  los últimos 0,2 s de la recarga se guarda y se usa en cuanto el escudo está listo.
- La racha no da puntos extra: se ve como una flor que crece junto a la persona; el escudo florece
  más, Echi crece apenas y la música suma una melodía. Las rachas de 20, 30, 40… se celebran.
- Bloquear un grupo entero de un solo toque se celebra con «¡Grupo completo!».
- Los «¡Perfecto!», los dorados y los grupos completos congelan el juego un instante (pausa de impacto).
- Superar el récord anterior se celebra en plena partida con «¡Nuevo récord!».
- Ráfaga final (últimos 10 s): música más rápida y marco dorado.
- Un fallo rompe la racha, el borde de la pantalla se tiñe de morado y el juego dice por qué
  («¡Muy pronto!», «¡Toca cuando brille!», «¡Un poco tarde!»), pero la partida sigue hasta los 60 s.
- Flechas en los bordes avisan de criaturas que aún están fuera de la pantalla.
- El récord se guarda en el navegador. Pausa con el botón ‖ (o Esc / P); la partida se pausa sola si se cambia de aplicación.

## Dónde editar

- `src/content/producto.js`: mensajes de cada clima, frase para quien presenta, aviso y textos de «Conoce el producto».
  **Antes de publicar, reemplaza el resumen del prospecto por el texto oficial aprobado.**
- `src/assets/marca/`: foto real del producto (`echinacea-medica.png`, frasco y caja con fondo
  transparente) y logo de INTI (`inti-logo.webp`). Se usan en la portada, en el final y en
  «Conoce el producto»; para cambiarlos basta con reemplazar los archivos con el mismo nombre.
- `src/game/config.js`: duración, velocidades, frecuencia de criaturas, duración del escudo y puntos.
- `src/game/engine.js`: lógica de la partida (sin dibujo; probada en `tests/engine.test.mjs`).
- `src/game/scene.js` y `src/game/art.js`: escenario, clima y personajes (Canvas 2D).
- `src/game/audio.js`: música y efectos sintetizados (Web Audio, sin archivos).
- `src/components/EchiGame.jsx`: pantallas, HUD y controles.

Agregar `?debug` a la URL expone el estado en `window.__echi` (solo para pruebas).
