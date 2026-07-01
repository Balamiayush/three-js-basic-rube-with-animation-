import * as THREE from "three";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
// import { OrbitControls } from "three/examples/jsm/Addons.js";

// Scene
const scene = new THREE.Scene();

// Clock
const clock = new THREE.Clock();


//textrueloader

const textureLoader= new THREE.TextureLoader()

const colorTexture= textureLoader.load("https://images.pexels.com/photos/34968581/pexels-photo-34968581.jpeg")

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.position.z =5;

// Cube
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({
        map:colorTexture
    })
);

scene.add(cube);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
});

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
resize();

// Controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

// Animation
gsap.to(cube.scale,{
    scrollTrigger: {
        trigger: "body",
        start: "top top",
        end:"bottom bottom",
        markers:true,
        scrub: 1,
    },
    x:1,
    y:-2,
    
   
})
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    cube.rotation.x = elapsedTime;
    cube.rotation.y = elapsedTime;


    renderer.render(scene, camera);
}

animate();


///cube 