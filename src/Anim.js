import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import GUI from "lil-gui";

export default class Experience {
  constructor(options) {
    this.time = 0;
    this.container = options.dom;

    // Track real and smoothed mouse vectors
    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.targetMouse = new THREE.Vector2(0.5, 0.5);

    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    this.setupGUI();
    this.setupMouseEvents();
    this.setupResize();
    this.addObjects();
    this.tick();
  }

  setupGUI() {
    this.settings = {
      pixelSize: 6,
      dotColor: "#ff0055",
      bgColor: "#050015",
      animatePattern: true,
      waveSpeed: 1.5,
      distortion: 4,
      trailRadius: 0.3,       // Controls how far the fluid push extends
      trailIntensity: 1.2     // Strength of the distortion
    };

    this.gui = new GUI();
    this.gui.add(this.settings, "pixelSize", 1, 20, 0.5);
    this.gui.addColor(this.settings, "dotColor");
    this.gui.addColor(this.settings, "bgColor");
    this.gui.add(this.settings, "animatePattern");
    this.gui.add(this.settings, "waveSpeed", 0, 5, 0.1);
    this.gui.add(this.settings, "distortion", 0, 20, 0.1);
    this.gui.add(this.settings, "trailRadius", 0.05, 1.0, 0.01).name("Mouse Radius");
    this.gui.add(this.settings, "trailIntensity", 0.0, 5.0, 0.1).name("Mouse Push");
  }

  setupMouseEvents() {
    window.addEventListener("mousemove", (event) => {
      // Map coordinates to standard [0.0 - 1.0] viewport space
      this.targetMouse.x = event.clientX / this.width;
      this.targetMouse.y = 1.0 - (event.clientY / this.height); // Invert Y axis for WebGL UV Space
    });
  }

  setupTexture() {
    this.texture = new THREE.TextureLoader().load("https://images.pexels.com/photos/838869/pexels-photo-838869.jpeg");
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.needsUpdate = true;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050015);
  }

  setupCamera() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.z = 1.4; // Zoomed to fit the display nicely behind the text
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = false; // Prevent zooming over text sections
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  addObjects() {
    this.setupTexture();
    const geometry = new THREE.PlaneGeometry(2.5, 2.5, 64, 64);
    
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      uniforms: {
        uPixelSize: { value: 6.0 },
        uTexture: { value: this.texture },
        uDotColor: { value: new THREE.Color("#ff0055") },
        uBgColor: { value: new THREE.Color("#050015") },
        uTime: { value: 0 },
        uDistortion: { value: 4.0 },
        uWaveSpeed: { value: 1.5 },
        uAnimatePattern: { value: 1.0 },
        // Mouse uniforms
        uMouse: { value: this.mouse },
        uTrailRadius: { value: 0.3 },
        uTrailIntensity: { value: 1.2 }
      },
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }

  update() {
    this.time += 0.01;
    this.controls.update();

    // Linearly interpolate (LERP) the current mouse value for fluid dampening
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08;

    if (this.material) {
      this.material.uniforms.uTime.value = this.time;
      this.material.uniforms.uPixelSize.value = this.settings.pixelSize;
      this.material.uniforms.uDotColor.value.set(this.settings.dotColor);
      this.material.uniforms.uBgColor.value.set(this.settings.bgColor);
      this.material.uniforms.uDistortion.value = this.settings.distortion;
      this.material.uniforms.uWaveSpeed.value = this.settings.waveSpeed;
      this.material.uniforms.uAnimatePattern.value = this.settings.animatePattern ? 1.0 : 0.0;
      
      // Keep mouse uniform variables synced
      this.material.uniforms.uMouse.value = this.mouse;
      this.material.uniforms.uTrailRadius.value = this.settings.trailRadius;
      this.material.uniforms.uTrailIntensity.value = this.settings.trailIntensity;
    }
  }

  tick() {
    this.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.tick.bind(this));
  }

  dispose() {
    this.renderer.dispose();
    window.removeEventListener("resize", this.resize.bind(this));
  }
}

new Experience({ dom: document.getElementById("container") });