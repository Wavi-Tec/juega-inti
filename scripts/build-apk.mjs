// Genera la app de Android del juego:
//   npm run apk  → echi-te-acompana.apk (para instalar directo en los celulares)
//   npm run aab  → echi-te-acompana.aab (para subir a Play Store)
// 1) Exporta el juego como archivos estáticos (out/).
// 2) Los copia al proyecto Android con Capacitor.
// 3) Compila la versión optimizada (release) con Gradle y deja el archivo en la raíz del proyecto.
// Firma con la clave de INTI si existe android/keystore.properties; si no, con la clave de pruebas
// de esta PC (no sirve para producción). Antes de repartir una versión nueva, sube versionCode en
// android/app/build.gradle. La app lleva el juego completo adentro y funciona sin internet.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const win = process.platform === 'win32';
const env = { ...process.env };
const bundle = process.argv.includes('--aab');

// Si no está configurado, se usa la carpeta donde Android Studio instala el SDK.
if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT) {
  const guess = win ? join(env.LOCALAPPDATA ?? '', 'Android', 'Sdk') : join(env.HOME ?? '', 'Android', 'Sdk');
  if (existsSync(guess)) env.ANDROID_HOME = guess;
}

function run(label, cmd, args, opts = {}) {
  console.log(`\n▶ ${label}`);
  const options = { stdio: 'inherit', cwd: root, env, ...opts };
  // En Windows npx y gradlew son scripts .cmd/.bat: se ejecutan por la consola como un solo comando.
  const result = win
    ? spawnSync([cmd, ...args].join(' '), { ...options, shell: true })
    : spawnSync(cmd, args, options);
  if (result.status !== 0) {
    console.error(`\n✖ Falló: ${label}`);
    process.exit(result.status ?? 1);
  }
}

const production = existsSync(join(root, 'android', 'keystore.properties'));

run('Exportando el juego (out/)', 'npx', ['next', 'build'], { env: { ...env, ECHI_EXPORT: '1' } });
run('Copiando el juego al proyecto Android', 'npx', ['cap', 'sync', 'android']);
run(
  bundle ? 'Compilando el paquete para Play Store (AAB)' : 'Compilando el APK',
  win ? '.\\gradlew.bat' : './gradlew',
  [bundle ? 'bundleRelease' : 'assembleRelease'],
  { cwd: join(root, 'android') }
);

const out = join(root, 'android', 'app', 'build', 'outputs');
const built = bundle ? join(out, 'bundle', 'release', 'app-release.aab') : join(out, 'apk', 'release', 'app-release.apk');
const dest = join(root, bundle ? 'echi-te-acompana.aab' : 'echi-te-acompana.apk');
copyFileSync(built, dest);
console.log(`\n✔ Listo: ${dest}`);
console.log(
  production
    ? '  Firmado con la clave de producción (android/keystore.properties).'
    : '  ⚠ Firmado con la clave de PRUEBAS de esta PC: sirve para probar, no para producción ni Play Store.\n' +
        '    Para firmar con la clave de INTI, crea android/keystore.properties (ver keystore.properties.example).'
);
