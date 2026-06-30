import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { OrbitControls } from "three/examples/jsm/Addons.js";

gsap.registerPlugin(ScrollTrigger);

// 1. SELECT THE CANVAS ELEMENT
const canvas =
  document.querySelector("canvas#canvas") || document.querySelector("canvas");

// Array
const cubes = [];
const cubes2 = []
// Scene
const scene = new THREE.Scene();

// Texture Loader
const textureLoader = new THREE.TextureLoader();
const colorTexture = textureLoader.load(
  "https://images.pexels.com/photos/34968581/pexels-photo-34968581.jpeg",
);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(4, 4, 6);

// Cube Geometry & Material
const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const material = new THREE.MeshBasicMaterial({ map: colorTexture });

// 2. THE GRID GENERATOR
const spacing = 1.1; // Slightly spaced out so individual items look cleaner

for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      const cube = new THREE.Mesh(geometry, material);

      // Position each cube in the 3D grid layout
      cube.position.set(x * spacing, y * spacing, z * spacing);

      // Store the original position directly on the object
      cube.userData.initialPosition = cube.position.clone();

      // Mark the exact center cube explicitly
      cube.userData.isCenter = x === 0 && y === 0 && z === 0;

      scene.add(cube);
      cubes.push(cube);
    
    }
  }
}

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener("resize", resize);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- RAYCASTER & INTERACTION SETUP ---

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isAnimating = false;

window.addEventListener("click", (event) => {
  if (isAnimating) return;

  // Standard normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(cubes);

  // FIXED LOGIC: If they click ANY part of the Rubik's cube structure, run the explosion!
  if (intersects.length > 0) {
    isAnimating = true;

    // Create a unified GSAP Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating = false;
      },
    });

    // Target all cubes together
    cubes.forEach((cube) => {
      if (cube.userData.isCenter) return; // Core stays still

      const initPos = cube.userData.initialPosition;
      const expansionFactor = 1.5;

      tl.to(
        cube.position,
        {
          x: initPos.x * expansionFactor,
          y: initPos.y * expansionFactor,
          z: initPos.z * expansionFactor,
          duration: 0.8,
          ease: "power2.inOut", 
          yoyo: true,
          repeat: -1,
        },
        0,
      );
    });
  }
});

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
