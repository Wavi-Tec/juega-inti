// Personajes en 3D (modelos .glb de public/models) dibujados con three.js en un lienzo WebGL
// aparte y copiados al lienzo 2D de la escena, en la capa de los personajes. Así el escudo, las
// criaturas y los efectos siguen dibujándose por delante, igual que con los personajes 2D.
//
// Los modelos no traen esqueleto: la caminata se hace deformando la malla en la tarjeta gráfica
// (piernas y brazos de la persona giran en la cadera y el hombro; Echi aletea sus hojas y da
// pasitos). La ropa de la persona cambia con el clima: la polera se vuelve impermeable amarillo o
// abrigo azul y aparecen un sombrero de lluvia o gorro y bufanda.
// Para optimizar un modelo nuevo de Meshy: `npm run modelo`.

const MODELS = { persona: '/models/persona.glb', echi: '/models/echi.glb' };

// Recuadro de cada personaje, en múltiplos de su altura: ancho, cuánto sobra arriba (saltos,
// brazos en alto) y bajo los pies.
const BOX = {
  persona: { w: 1.1, top: 1.3, bottom: 0.06 },
  echi: { w: 1.5, top: 1.35, bottom: 0.06 },
};
// Los personajes se inclinan apenas hacia la cámara para que se vea un poco la parte de arriba.
const VIEW_TILT = 0.1;
// Tamaño máximo del dibujo de cada personaje, en píxeles.
const MAX_PX = 2048;

// Anatomía de la persona (alto 1, pies en y = 0, mirando hacia +z).
const PERSON = {
  hand: [-0.114, 0.184, 0.04], // mano derecha, donde lleva el frasco
  shoulder: { x: 0.105, y: 0.43, z: 0.02 },
  hip: { y: 0.165, z: 0 },
  legSwing: 0.42, // radianes de balanceo de las piernas al caminar
  armSwing: 0.4,
};

const smoothstep = (a, b, v) => {
  const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// Qué parte del cuerpo es cada vértice, según su posición y el color de la textura en ese punto
// (así el short oscuro no se mueve con el brazo ni los pétalos rosados con las hojas de Echi).
// Devuelve [x, y] por vértice: persona = [pierna, brazo]; Echi = [hoja, pie].
const LIMBS = {
  persona(p, [r, g, b]) {
    const ax = Math.abs(p.x);
    const dark = Math.max(r, g, b) < 95;
    const leg = (1 - smoothstep(0.11, 0.175, p.y)) * (1 - smoothstep(0.09, 0.105, ax));
    const arm = dark || p.y < 0.12 ? 0 : smoothstep(0.094, 0.112, ax) * (1 - smoothstep(0.42, 0.465, p.y));
    return [leg, arm];
  },
  echi(p, [r, g, b]) {
    const ax = Math.abs(p.x);
    const green = g > r && g > b * 1.1 && g - Math.min(r, b) > 25;
    if (!green) return [0, 0];
    const leaf = smoothstep(0.19, 0.24, ax) * (1 - smoothstep(0.36, 0.42, p.y)) * smoothstep(0.03, 0.07, p.y);
    const foot = (1 - smoothstep(0.07, 0.11, p.y)) * smoothstep(0.01, 0.03, ax) * (1 - smoothstep(0.2, 0.23, ax));
    return [leaf, foot];
  },
};

// Colores de la ropa según el clima, en HSV (tono, saturación, factor de brillo): la polera
// celeste se tiñe conservando sus sombras.
const RAIN_COAT = [43 / 360, 0.75, 1.05]; // impermeable amarillo
const SNOW_COAT = [213 / 360, 0.69, 0.88]; // abrigo azul

const GLSL_COMMON = /* glsl */ `
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
`;

// Deformación de la persona: piernas y brazos giran alrededor de la cadera y los hombros.
// limbWeight (calculado al cargar): x = cuánto es pierna, y = cuánto es brazo.
const PERSON_DEFORM = /* glsl */ `
attribute vec2 limbWeight;
uniform float uPhase;
uniform float uStride;
varying float vBodyY;
void deform(vec3 p0, inout vec3 p, inout vec3 n) {
  float swing = sin(uPhase) * uStride;
  float wl = limbWeight.x;
  if (wl > 0.0) {
    float legSide = p0.x < -0.005 ? -1.0 : 1.0;
    vec3 piv = vec3(0.0, ${PERSON.hip.y}, ${PERSON.hip.z});
    mat3 R = rotX(legSide * ${PERSON.legSwing} * swing * wl);
    p = piv + R * (p - piv);
    n = R * n;
  }
  // Cada brazo se balancea al revés que la pierna de su lado.
  float wa = limbWeight.y;
  if (wa > 0.0) {
    float armSide = p0.x < 0.0 ? -1.0 : 1.0;
    vec3 piv = vec3(armSide * ${PERSON.shoulder.x}, ${PERSON.shoulder.y}, ${PERSON.shoulder.z});
    mat3 R = rotX(-armSide * ${PERSON.armSwing} * swing * wa);
    p = piv + R * (p - piv);
    n = R * n;
  }
}
`;

// Deformación de Echi: las hojas aletean girando en su base y los pies se levantan por turnos.
// limbWeight (calculado al cargar): x = cuánto es hoja, y = cuánto es pie.
const ECHI_DEFORM = /* glsl */ `
attribute vec2 limbWeight;
uniform float uPhase;
uniform float uStride;
uniform float uLeaf;
void deform(vec3 p0, inout vec3 p, inout vec3 n) {
  float side = p0.x < 0.0 ? -1.0 : 1.0;
  float wleaf = limbWeight.x;
  if (wleaf > 0.0) {
    vec3 piv = vec3(side * 0.2, 0.33, 0.0);
    mat3 R = rotZ(side * uLeaf * wleaf);
    p = piv + R * (p - piv);
    n = R * n;
  }
  float wfoot = limbWeight.y;
  if (wfoot > 0.0) {
    float stepK = sin(uPhase + (side > 0.0 ? 3.14159 : 0.0));
    p.y += max(0.0, stepK) * 0.04 * uStride * wfoot;
    p.z += stepK * 0.025 * uStride * wfoot;
  }
}
`;

// Tinte de la polera según el clima (solo en el tronco, para no teñir brillos celestes de la cara).
const PERSON_TINT = /* glsl */ `
uniform float uRain;
uniform float uSnow;
uniform vec3 uRainHSV;
uniform vec3 uSnowHSV;
varying float vBodyY;
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
`;
const PERSON_TINT_APPLY = /* glsl */ `
#include <map_fragment>
if (uRain + uSnow > 0.001) {
  vec3 hsv = rgb2hsv(pow(max(diffuseColor.rgb, 0.0), vec3(1.0 / 2.2)));
  float shirt = smoothstep(0.42, 0.47, hsv.x) * (1.0 - smoothstep(0.58, 0.63, hsv.x))
    * smoothstep(0.07, 0.13, hsv.y) * smoothstep(0.35, 0.45, hsv.z)
    * (1.0 - smoothstep(0.455, 0.475, vBodyY));
  vec3 rainC = pow(hsv2rgb(vec3(uRainHSV.xy, min(1.0, hsv.z * uRainHSV.z))), vec3(2.2));
  vec3 snowC = pow(hsv2rgb(vec3(uSnowHSV.xy, min(1.0, hsv.z * uSnowHSV.z))), vec3(2.2));
  diffuseColor.rgb = mix(diffuseColor.rgb, rainC, shirt * uRain);
  diffuseColor.rgb = mix(diffuseColor.rgb, snowC, shirt * uSnow);
}
`;

const popIn = (k) => (k <= 0 ? 0 : 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2));

/** Carga three.js y los modelos. Devuelve null si el equipo no tiene WebGL o algo falla. */
export async function loadCharacters3D() {
  try {
    const THREE = await import('three');
    const [{ GLTFLoader }, { MeshoptDecoder }, { RoomEnvironment }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/libs/meshopt_decoder.module.js'),
      import('three/addons/environments/RoomEnvironment.js'),
    ]);
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [persona, echi] = await Promise.all([loader.loadAsync(MODELS.persona), loader.loadAsync(MODELS.echi)]);
    return new Characters3D(THREE, renderer, new RoomEnvironment(), { persona: persona.scene, echi: echi.scene });
  } catch (err) {
    console.warn('Personajes 3D no disponibles; se usan los dibujos 2D.', err);
    return null;
  }
}

// Pasa la malla a un espacio cómodo (alto 1, pies en y = 0, centrada) para que la deformación
// use medidas fijas. Los vértices vienen cuantizados: se convierten a números de punto flotante.
function normalizeModel(THREE, gltfScene) {
  gltfScene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltfScene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const k = 1 / size.y;
  const norm = new THREE.Matrix4()
    .makeScale(k, k, k)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
  const root = new THREE.Group();
  const meshes = [];
  gltfScene.traverse((o) => o.isMesh && meshes.push(o));
  for (const mesh of meshes) {
    const g = mesh.geometry;
    for (const name of ['position', 'normal']) {
      const a = g.getAttribute(name);
      if (!a) continue;
      const arr = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) {
        arr[i * 3] = a.getX(i);
        arr[i * 3 + 1] = a.getY(i);
        arr[i * 3 + 2] = a.getZ(i);
      }
      g.setAttribute(name, new THREE.BufferAttribute(arr, 3));
    }
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(norm, mesh.matrixWorld));
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    // La deformación mueve vértices fuera de la caja original.
    mesh.frustumCulled = false;
    root.add(mesh);
  }
  return { root, meshes };
}

// Guarda en la malla, por vértice, cuánto es pierna/brazo (o hoja/pie), para la deformación.
function addLimbWeights(THREE, mesh, kind) {
  const g = mesh.geometry;
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  const img = mesh.material.map?.image;
  const S = 256;
  let data = null;
  if (img && uv) {
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, S, S);
    data = cx.getImageData(0, 0, S, S).data;
  }
  const out = new Float32Array(pos.count * 2);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    let rgb = [128, 128, 128];
    if (data) {
      const u = uv.getX(i) - Math.floor(uv.getX(i));
      const v = uv.getY(i) - Math.floor(uv.getY(i));
      const o = (Math.min(S - 1, Math.floor(v * S)) * S + Math.min(S - 1, Math.floor(u * S))) * 4;
      rgb = [data[o], data[o + 1], data[o + 2]];
    }
    const [a, b] = LIMBS[kind](p, rgb);
    out[i * 2] = a;
    out[i * 2 + 1] = b;
  }
  g.setAttribute('limbWeight', new THREE.BufferAttribute(out, 2));
}

class Characters3D {
  constructor(THREE, renderer, room, models) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.canvas = renderer.domElement;
    this.lost = false;
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
    });

    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.setScissorTest(true);
    this.slotW = 0;
    this.slotH = 0;

    // Luz: ambiente suave de estudio, sol arriba a la izquierda (como en la escena 2D) y un
    // contraluz que separa a los personajes del fondo.
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
    scene.environmentIntensity = 0.55;
    this.hemi = new THREE.HemisphereLight('#ffffff', '#9fc49a', 1.1);
    this.sun = new THREE.DirectionalLight('#fff6e8', 2.4);
    this.sun.position.set(-2, 3, 3);
    this.rim = new THREE.DirectionalLight('#ffffff', 1.2);
    this.rim.position.set(2.5, 1.5, -2);
    scene.add(this.hemi, this.sun, this.rim);
    this.scene = scene;
    this.sunWarm = new THREE.Color('#fff6e8');
    this.sunCool = new THREE.Color('#dce6ff');

    this.uniforms = {
      persona: {
        uPhase: { value: 0 },
        uStride: { value: 0 },
        uRain: { value: 0 },
        uSnow: { value: 0 },
        uRainHSV: { value: new THREE.Vector3(...RAIN_COAT) },
        uSnowHSV: { value: new THREE.Vector3(...SNOW_COAT) },
      },
      echi: { uPhase: { value: 0 }, uStride: { value: 0 }, uLeaf: { value: 0 } },
    };

    this.chars = {};
    for (const [name, gltfScene] of Object.entries(models)) {
      const { root, meshes } = normalizeModel(THREE, gltfScene);
      for (const mesh of meshes) {
        addLimbWeights(THREE, mesh, name);
        this.prepareMaterial(mesh.material, name);
      }
      // Pivote en los pies: ahí se aplican los saltos, giros y estiramientos.
      const pivot = new THREE.Group();
      pivot.add(root);
      pivot.visible = false;
      scene.add(pivot);
      this.chars[name] = { pivot, root };
    }
    this.outfits = this.buildOutfits(this.chars.persona.root);
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 1, 0, -10, 10);
    this.camera.position.set(0, 0, 5);
    this.hand = new THREE.Object3D();
    this.chars.persona.root.add(this.hand);
    this.point = new THREE.Vector3();
  }

  // Material de plástico mate con la deformación (y, en la persona, el tinte de la ropa).
  prepareMaterial(m, name) {
    m.metalness = 0;
    m.metalnessMap = null;
    m.roughnessMap = null;
    m.roughness = 0.72;
    if (m.normalScale) m.normalScale.setScalar(0.55);
    const uniforms = this.uniforms[name];
    const person = name === 'persona';
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\n${person ? PERSON_DEFORM : ECHI_DEFORM}`)
        .replace(
          '#include <beginnormal_vertex>',
          '#include <beginnormal_vertex>\n{ vec3 q = position; deform(position, q, objectNormal); }'
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\n{ vec3 nn = vec3(0.0, 1.0, 0.0); deform(position, transformed, nn); }${person ? '\nvBodyY = position.y;' : ''}`
        );
      if (person) {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${PERSON_TINT}`)
          .replace('#include <map_fragment>', PERSON_TINT_APPLY);
      }
    };
    m.customProgramCacheKey = () => `echi-${name}`;
    m.needsUpdate = true;
  }

  // Sombrero de lluvia, gorro con pompón y bufanda, a la medida de la cabeza de la persona.
  buildOutfits(root) {
    const T = this.THREE;
    const mat = (color, roughness) => new T.MeshStandardMaterial({ color, roughness, side: T.DoubleSide });
    const dome = (rx, ry, rz, material) => {
      const m = new T.Mesh(new T.SphereGeometry(1, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), material);
      m.scale.set(rx, ry, rz);
      return m;
    };
    const group = (y) => {
      const g = new T.Group();
      g.position.set(0, y, -0.005);
      g.visible = false;
      root.add(g);
      return g;
    };

    // Lluvia: sombrero impermeable amarillo de ala ancha.
    const yellow = mat('#F2BE3C', 0.45);
    const rainHat = group(0.785);
    rainHat.add(dome(0.29, 0.23, 0.285, yellow));
    const brim = new T.Mesh(new T.CylinderGeometry(0.3, 0.42, 0.04, 40, 1, true), yellow);
    brim.position.y = -0.005;
    rainHat.add(brim);

    // Nieve: gorro rosado con borde y pompón blancos, y bufanda.
    const pink = mat('#E5407F', 0.95);
    const white = mat('#FFFFFF', 0.95);
    const beanie = group(0.775);
    beanie.add(dome(0.297, 0.27, 0.29, pink));
    const cuff = new T.Mesh(new T.TorusGeometry(0.288, 0.042, 12, 40), white);
    cuff.rotation.x = Math.PI / 2;
    cuff.scale.set(1, 0.98, 1);
    cuff.position.y = 0.012;
    beanie.add(cuff);
    const pompom = new T.Mesh(new T.SphereGeometry(0.062, 16, 12), white);
    pompom.position.y = 0.285;
    beanie.add(pompom);

    const scarf = group(0.462);
    const ring = new T.Mesh(new T.TorusGeometry(0.1, 0.042, 12, 32), pink);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.025;
    scarf.add(ring);
    const tail = new T.Mesh(new T.BoxGeometry(0.065, 0.16, 0.03), pink);
    tail.position.set(0.05, -0.085, 0.12);
    tail.rotation.set(0.25, 0, -0.18);
    scarf.add(tail);
    const stripe = new T.Mesh(new T.BoxGeometry(0.068, 0.018, 0.033), white);
    stripe.position.set(0.055, -0.13, 0.13);
    stripe.rotation.set(0.25, 0, -0.18);
    scarf.add(stripe);

    return { rain: [rainHat], snow: [beanie, scarf] };
  }

  get ready() {
    return !this.lost;
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // El lienzo WebGL solo crece: cambiarlo de tamaño en cada cuadro sería caro.
  ensureSize(w, h) {
    if (w <= this.slotW && h <= this.slotH) return;
    this.slotW = Math.max(this.slotW, w);
    this.slotH = Math.max(this.slotH, h);
    this.renderer.setSize(this.slotW * 2, this.slotH, false);
  }

  // Mano derecha de la persona, siguiendo el balanceo del brazo (el mismo giro que en el shader).
  updateHand(swing) {
    const { y, z } = PERSON.shoulder;
    const [hx, hy, hz] = PERSON.hand;
    const a = PERSON.armSwing * swing;
    const dy = hy - y;
    const dz = hz - z;
    this.hand.position.set(hx, y + Math.cos(a) * dy - Math.sin(a) * dz, z + Math.sin(a) * dy + Math.cos(a) * dz);
  }

  /**
   * Dibuja un personaje en el contexto 2D `ctx`, con los pies en (x, y) y `height` de alto, en
   * unidades del contexto.
   * o: { x, y, height, turn (giro, rad; positivo mira a la derecha), tilt (balanceo de lado),
   *   lean (inclinación hacia adelante), lift (salto, en alturas), sx, sy (estiramiento),
   *   light (0..1, fuerza del sol), cool (0..1, luz más fría), phase (fase del paso),
   *   stride (0..1, cuánto camina), rain, snow (0..1, ropa de lluvia o nieve),
   *   leaf (aleteo de las hojas de Echi, rad) }
   * Para la persona devuelve la posición de su mano en el contexto: { hand: { x, y } }.
   */
  draw(ctx, name, o) {
    const box = BOX[name];
    const m = ctx.getTransform();
    const s = Math.hypot(m.a, m.b);
    const bh = box.top + box.bottom;
    const dw = box.w * o.height;
    const dh = bh * o.height;
    const left = o.x - dw / 2;
    const top = o.y - box.top * o.height;
    // Esquina en píxeles reales, alineada a la grilla: así la imagen se copia píxel a píxel y no se
    // re-muestrea (lo que la dejaba borrosa al moverse).
    const dx = m.a * left + m.c * top + m.e;
    const dy = m.b * left + m.d * top + m.f;
    const ix = Math.floor(dx);
    const iy = Math.floor(dy);
    // En pantallas enormes se limita la resolución (y entonces sí se escala al copiar).
    const res = Math.min(1, MAX_PX / Math.max(dw * s + 1, dh * s + 1));
    const vw = Math.max(1, Math.ceil((dw * s + (dx - ix)) * res));
    const vh = Math.max(1, Math.ceil((dh * s + (dy - iy)) * res));
    this.ensureSize(vw, vh);

    const light = o.light ?? 1;
    this.sun.intensity = 2.4 * light;
    this.sun.color.copy(this.sunWarm).lerp(this.sunCool, o.cool ?? 0);
    this.hemi.intensity = 1.1 * (0.8 + 0.2 * light);

    const u = this.uniforms[name];
    u.uPhase.value = o.phase ?? 0;
    u.uStride.value = o.stride ?? 0;
    if (name === 'persona') {
      u.uRain.value = o.rain ?? 0;
      u.uSnow.value = o.snow ?? 0;
      for (const [kind, parts] of Object.entries(this.outfits)) {
        const k = popIn(smoothstep(0.2, 0.7, o[kind] ?? 0));
        for (const g of parts) {
          g.visible = k > 0.01;
          g.scale.setScalar(Math.max(0.001, k));
        }
      }
      this.updateHand(Math.sin(o.phase ?? 0) * (o.stride ?? 0));
    } else {
      u.uLeaf.value = o.leaf ?? 0;
    }

    for (const [key, c] of Object.entries(this.chars)) c.pivot.visible = key === name;
    const pivot = this.chars[name].pivot;
    pivot.position.set(0, o.lift ?? 0, 0);
    // Primero el giro sobre su eje y después la inclinación y el balanceo, vistos desde la cámara.
    pivot.rotation.set(VIEW_TILT + (o.lean ?? 0), o.turn ?? 0, o.tilt ?? 0, 'XZY');
    pivot.scale.set(o.sx ?? 1, o.sy ?? 1, o.sx ?? 1);

    // Cámara: el recuadro del personaje, corrido por la fracción de píxel de la esquina.
    const unit = 1 / (o.height * s * res);
    const cam = this.camera;
    cam.left = -box.w / 2 - (dx - ix) * res * unit;
    cam.right = cam.left + vw * unit;
    cam.top = box.top + (dy - iy) * res * unit;
    cam.bottom = cam.top - vh * unit;
    cam.updateProjectionMatrix();

    const slotX = name === 'persona' ? 0 : this.slotW;
    this.renderer.setViewport(slotX, 0, vw, vh);
    this.renderer.setScissor(slotX, 0, vw, vh);
    this.renderer.render(this.scene, cam);

    // En WebGL el origen está abajo: el dibujo ocupa la franja inferior del lienzo.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.canvas, slotX, this.canvas.height - vh, vw, vh, ix, iy, vw / res, vh / res);
    ctx.restore();

    if (name !== 'persona') return null;
    const p = this.hand.getWorldPosition(this.point).project(cam);
    const hx = ix + ((p.x + 1) / 2) * (vw / res);
    const hy = iy + ((1 - p.y) / 2) * (vh / res);
    // De píxeles reales a las unidades del contexto.
    const inv = m.inverse();
    return { hand: { x: inv.a * hx + inv.c * hy + inv.e, y: inv.b * hx + inv.d * hy + inv.f } };
  }
}
