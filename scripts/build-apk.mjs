// Genera el instalador de Android (APK) del juego: `npm run apk`.
// 1) Exporta el juego como archivos estáticos (out/).
// 2) Los copia al proyecto Android con Capacitor.
// 3) Compila el APK optimizado (release) con Gradle y lo deja en echi-te-acompana.apk, en la raíz
//    del proyecto. Antes de repartir una versión nueva, sube versionCode en android/app/build.gradle.
// El APK lleva el juego completo adentro, así que funciona sin internet.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const win = process.platform === 'win32';
const env = { ...process.env };

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

run('Exportando el juego (out/)', 'npx', ['next', 'build'], { env: { ...env, ECHI_EXPORT: '1' } });
run('Copiando el juego al proyecto Android', 'npx', ['cap', 'sync', 'android']);
run('Compilando el APK', win ? '.\\gradlew.bat' : './gradlew', ['assembleRelease'], { cwd: join(root, 'android') });

const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const dest = join(root, 'echi-te-acompana.apk');
copyFileSync(apk, dest);
console.log(`\n✔ Listo: ${dest}`);
