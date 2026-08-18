import './style.css';
import '@fontsource-variable/onest';
import * as THREE from 'three';

const canvas = document.querySelector('#earth-canvas');
const loader = document.querySelector('#loading');
const telemetry = document.querySelector('#telemetry');
const motionToggle = document.querySelector('#motion-toggle');
const motionLabel = motionToggle.querySelector('.motion-label');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 0, 6.7);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;

const display = new THREE.Group();
display.scale.setScalar(0.9);
scene.add(display);

const textureLoader = new THREE.TextureLoader();
let earthMap;
let earthNormal;
let earthSpecular;

try {
  [earthMap, earthNormal, earthSpecular] = await Promise.all([
    textureLoader.loadAsync('/assets/earth-day.jpg'),
    textureLoader.loadAsync('/assets/earth-normal.jpg'),
    textureLoader.loadAsync('/assets/earth-specular.jpg'),
  ]);
} catch {
  loader.querySelector('p').textContent = 'Earth could not be found';
  throw new Error('Earth texture assets failed to load.');
}

earthMap.colorSpace = THREE.SRGBColorSpace;
[earthMap, earthNormal, earthSpecular].forEach((texture) => {
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
});

const globeCenterY = 0.32;
const innerGlobe = new THREE.Group();
innerGlobe.position.y = globeCenterY;
innerGlobe.rotation.z = THREE.MathUtils.degToRad(-23.4);
display.add(innerGlobe);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(0.96, 128, 128),
  new THREE.MeshPhysicalMaterial({
    map: earthMap,
    normalMap: earthNormal,
    normalScale: new THREE.Vector2(0.44, 0.44),
    specularIntensityMap: earthSpecular,
    specularIntensity: 0.9,
    specularColor: new THREE.Color(0x76b8e8),
    roughness: 0.54,
    metalness: 0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.42,
  }),
);
earth.rotation.y = -1.82;
innerGlobe.add(earth);

const cloudMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPosition;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float noise(vec3 p) {
      vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y), mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float f = 0.0;
      f += noise(p) * .5; p *= 2.02;
      f += noise(p) * .25; p *= 2.03;
      f += noise(p) * .125; p *= 2.01;
      f += noise(p) * .0625;
      return f;
    }
    void main() {
      vec3 p = normalize(vPosition) * vec3(4.7, 6.6, 4.7) + vec3(uTime * .006, 0.0, 0.0);
      float cloud = smoothstep(.58, .72, fbm(p));
      float edge = .78 + pow(1.0 - max(vNormal.z, 0.0), 2.0) * .22;
      gl_FragColor = vec4(vec3(.96, .98, 1.0), cloud * .2 * edge);
    }
  `,
});
const clouds = new THREE.Mesh(new THREE.SphereGeometry(0.973, 96, 96), cloudMaterial);
clouds.rotation.y = -1.77;
innerGlobe.add(clouds);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.992, 96, 96),
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float rim = pow(1.0 - max(vNormal.z, 0.0), 4.4);
        rim = smoothstep(.18, .82, rim);
        gl_FragColor = vec4(.19, .56, 1.0, rim * .28);
      }
    `,
  }),
);
innerGlobe.add(atmosphere);

const acrylicMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    uSunDirection: { value: new THREE.Vector3(-0.5, 0.62, 0.84).normalize() },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewPosition = -viewPosition.xyz;
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDirection;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDirection = normalize(vViewPosition);
      float facing = max(dot(normal, viewDirection), 0.0);
      float edge = pow(1.0 - facing, 7.5);
      float sun = pow(max(dot(reflect(-uSunDirection, normal), viewDirection), 0.0), 180.0);
      float sunBloom = pow(max(dot(reflect(-uSunDirection, normal), viewDirection), 0.0), 42.0);
      vec3 shellColor = vec3(.34, .68, 1.0) * edge * .42;
      vec3 reflection = vec3(1.0, .97, .92) * sun * .9 + vec3(.46, .66, 1.0) * sunBloom * .055;
      float alpha = edge * .2 + sun * .84 + sunBloom * .035;
      gl_FragColor = vec4(shellColor + reflection, alpha);
    }
  `,
});

const outerShell = new THREE.Mesh(new THREE.SphereGeometry(1.055, 128, 128), acrylicMaterial);
outerShell.position.y = globeCenterY;
outerShell.renderOrder = 3;
display.add(outerShell);

const seam = new THREE.Mesh(
  new THREE.TorusGeometry(1.057, 0.0018, 6, 256),
  new THREE.MeshBasicMaterial({
    color: 0xe8f6ff,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
  }),
);
seam.position.y = globeCenterY;
seam.rotation.x = Math.PI / 2;
seam.renderOrder = 4;
display.add(seam);

function seededRandom(seed) {
  const value = Math.sin(seed * 918.17) * 43758.5453;
  return value - Math.floor(value);
}

const starPositions = new Float32Array(520 * 3);
for (let index = 0; index < 520; index += 1) {
  starPositions[index * 3] = (seededRandom(index * 3 + 1) - 0.5) * 23;
  starPositions[index * 3 + 1] = (seededRandom(index * 3 + 2) - 0.5) * 14;
  starPositions[index * 3 + 2] = -2 - seededRandom(index * 3 + 3) * 12;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: 0xdde9ff,
    size: 0.017,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  }),
);
scene.add(stars);

const keyLight = new THREE.DirectionalLight(0xfff6ea, 4.1);
keyLight.position.set(-4.2, 2.7, 5.1);
scene.add(keyLight);

const edgeLight = new THREE.DirectionalLight(0x5577ff, 1.4);
edgeLight.position.set(4.5, -0.7, -2.8);
scene.add(edgeLight);

scene.add(new THREE.AmbientLight(0x14213d, 0.24));

const state = {
  paused: reducedMotion,
  dragging: false,
  startX: 0,
  startY: 0,
  startRotationX: 0,
  startRotationY: 0,
  rotationX: 0,
  rotationY: 0,
  velocityX: 0,
  velocityY: 0,
  pointerX: 0,
  pointerY: 0,
  targetPointerX: 0,
  targetPointerY: 0,
  intro: 0,
};

function setDisplayPosition() {
  if (window.innerWidth <= 880) {
    display.position.set(0, -0.9, 0);
  } else {
    display.position.set(1.28, -0.22, 0);
  }
}

function setPaused(paused) {
  state.paused = paused;
  motionToggle.setAttribute('aria-pressed', String(paused));
  motionLabel.textContent = paused ? 'Resume rotation' : 'Pause rotation';
}

setDisplayPosition();
setPaused(reducedMotion);

let lastTime = performance.now();

function animate(time) {
  const delta = Math.min((time - lastTime) / 1000, 0.04);
  lastTime = time;
  state.pointerX += (state.targetPointerX - state.pointerX) * 0.035;
  state.pointerY += (state.targetPointerY - state.pointerY) * 0.035;
  state.intro += (1 - state.intro) * 0.032;

  if (!state.dragging) {
    state.rotationY += state.velocityX;
    state.rotationX += state.velocityY;
    state.velocityX *= 0.93;
    state.velocityY *= 0.93;
  }

  if (!state.paused) {
    const rotationSpeed = delta * 0.052;
    earth.rotation.y += rotationSpeed;
    clouds.rotation.y += rotationSpeed * 1.06;
    cloudMaterial.uniforms.uTime.value = time * 0.001;
  }

  innerGlobe.rotation.x = state.rotationX;
  innerGlobe.rotation.y = state.rotationY;
  display.scale.setScalar(0.9 + state.intro * 0.1);
  display.rotation.y = state.pointerX * 0.012;
  display.rotation.x = state.pointerY * 0.008;
  stars.position.x = state.pointerX * -0.055;
  stars.position.y = state.pointerY * 0.035;

  const degrees = ((earth.rotation.y * 180) / Math.PI + 360) % 360;
  telemetry.textContent = `${degrees.toFixed(1).padStart(5, '0')}° E`;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('pointermove', (event) => {
  state.targetPointerX = (event.clientX / window.innerWidth) * 2 - 1;
  state.targetPointerY = (event.clientY / window.innerHeight) * 2 - 1;

  if (!state.dragging) return;

  const deltaX = event.clientX - state.startX;
  const deltaY = event.clientY - state.startY;
  state.rotationY = state.startRotationY + deltaX * 0.0042;
  state.rotationX = THREE.MathUtils.clamp(state.startRotationX + deltaY * 0.0032, -0.5, 0.5);
  state.velocityX = (event.movementX || 0) * 0.0002;
  state.velocityY = (event.movementY || 0) * 0.00012;
});

canvas.addEventListener('pointerdown', (event) => {
  state.dragging = true;
  state.startX = event.clientX;
  state.startY = event.clientY;
  state.startRotationX = state.rotationX;
  state.startRotationY = state.rotationY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointerup', (event) => {
  state.dragging = false;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('pointercancel', () => {
  state.dragging = false;
});

motionToggle.addEventListener('click', () => setPaused(!state.paused));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  setDisplayPosition();
});

requestAnimationFrame(animate);
requestAnimationFrame(() => {
  loader.classList.add('is-hidden');
  document.body.classList.add('is-ready');
});
