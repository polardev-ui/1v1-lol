import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';

const EARTH_RADIUS = 5;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040b);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 7, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 7;
controls.maxDistance = 38;

const ambientLight = new THREE.AmbientLight(0x7f93bd, 0.35);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
sunLight.position.set(20, 8, 12);
scene.add(sunLight);

const loader = new THREE.TextureLoader();
const loading = document.getElementById('loading');

const earthDay = loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
const earthNight = loader.load('https://threejs.org/examples/textures/planets/earth_lights_2048.png');
const earthSpec = loader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg');
const cloudTex = loader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png');

const earthMaterial = new THREE.MeshPhongMaterial({
  map: earthDay,
  specularMap: earthSpec,
  specular: new THREE.Color(0x394f71),
  shininess: 18,
  emissiveMap: earthNight,
  emissive: new THREE.Color(0xffffff),
  emissiveIntensity: 0.7
});

const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 96, 96), earthMaterial);
scene.add(earth);

const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.01, 64, 64),
  new THREE.MeshLambertMaterial({ map: cloudTex, transparent: true, opacity: 0.42 })
);
scene.add(clouds);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.08, 64, 64),
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      glowColor: { value: new THREE.Color(0x6bb5ff) },
      c: { value: 0.5 },
      p: { value: 4.0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float c;
      uniform float p;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float intensity = pow(c - dot(vNormal, viewDirection), p);
        gl_FragColor = vec4(glowColor, intensity * 0.55);
      }
    `
  })
);
scene.add(atmosphere);

const cityGroup = new THREE.Group();
scene.add(cityGroup);

const cityLocations = [
  { name: 'New York', lat: 40.7128, lon: -74.006 },
  { name: 'London', lat: 51.5072, lon: -0.1276 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 }
];

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

const gltfLoader = new GLTFLoader();
const cityModelUrl = 'https://rawcdn.githack.com/mrdoob/three.js/r161/examples/models/gltf/LittlestTokyo.glb';

gltfLoader.load(
  cityModelUrl,
  (gltf) => {
    const baseModel = gltf.scene;
    baseModel.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    cityLocations.forEach((city, idx) => {
      const model = baseModel.clone(true);
      const position = latLonToVector3(city.lat, city.lon, EARTH_RADIUS + 0.34);
      model.position.copy(position);
      const normal = position.clone().normalize();
      model.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      model.rotateY((idx / cityLocations.length) * Math.PI * 2);
      model.scale.setScalar(0.0023);
      cityGroup.add(model);
    });

    loading.textContent = 'Loaded Earth, atmosphere, clouds, and city models';
    setTimeout(() => (loading.style.display = 'none'), 2400);
  },
  undefined,
  () => {
    loading.textContent = 'Loaded Earth. City models unavailable in this network.';
  }
);

const toggleClouds = document.getElementById('toggleClouds');
const toggleAtmosphere = document.getElementById('toggleAtmosphere');
const toggleNight = document.getElementById('toggleNight');

toggleClouds.addEventListener('change', () => {
  clouds.visible = toggleClouds.checked;
});

toggleAtmosphere.addEventListener('change', () => {
  atmosphere.visible = toggleAtmosphere.checked;
});

toggleNight.addEventListener('change', () => {
  earthMaterial.emissiveIntensity = toggleNight.checked ? 0.7 : 0.0;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  earth.rotation.y += 0.0008;
  clouds.rotation.y += 0.0011;
  cityGroup.rotation.y += 0.0008;
  controls.update();
  renderer.render(scene, camera);
}

animate();
