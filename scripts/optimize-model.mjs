// Optimiza un modelo 3D exportado de Meshy (.glb muy pesado) para usarlo en el juego:
//   npm run modelo -- persona ruta/al/modelo.glb
//   npm run modelo -- echi ruta/al/modelo.glb
// Reduce los polígonos, deja la textura de color en 1024 px y la de relieve en 512 px (WebP), quita
// la textura de metal/rugosidad (el juego usa un material mate) y comprime la geometría con meshopt
// (three.js trae el decodificador, así que el juego sigue funcionando sin internet).
// El resultado queda en public/models/<personaje>.glb.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join as joinMeshes, weld, simplify, prune, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

// vertices: a cuántos vértices se apunta al simplificar (el resultado queda algo por encima porque
// se respetan las costuras de las texturas). normalMap: si se conserva la textura de relieve; la
// de la persona deja rayitas claras en el pelo y la cara, así que se quita.
const CHARACTERS = {
  persona: { vertices: 15600, normalMap: false },
  echi: { vertices: 19000, normalMap: true },
};

const root = fileURLToPath(new URL('..', import.meta.url));
const [name, input] = process.argv.slice(2);
if (!CHARACTERS[name] || !input) {
  console.error('Uso: npm run modelo -- <persona|echi> <archivo.glb>');
  process.exit(1);
}

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(input);

const vertices = doc
  .getRoot()
  .listMeshes()
  .flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + p.getAttribute('POSITION').getCount(), 0);
const ratio = Math.min(1, CHARACTERS[name].vertices / vertices);
console.log(`${name}: ${vertices} vértices, se conserva ~${(ratio * 100).toFixed(1)} %`);

// Plástico mate: sin metal y con rugosidad fija.
for (const material of doc.getRoot().listMaterials()) {
  material.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.72);
  if (!CHARACTERS[name].normalMap) material.setNormalTexture(null);
}

await doc.transform(
  dedup(),
  flatten(),
  joinMeshes(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 }),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], slots: /^baseColor/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], slots: /^normal/ }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' })
);

const tris = doc
  .getRoot()
  .listMeshes()
  .flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);
const outDir = join(root, 'public', 'models');
mkdirSync(outDir, { recursive: true });
const output = join(outDir, `${name}.glb`);
await io.write(output, doc);
console.log(`→ ${output} (${Math.round(tris)} triángulos)`);
