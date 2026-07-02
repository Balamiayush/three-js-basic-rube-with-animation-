import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "lil-gui"; // components use lil-gui, switch to dat.gui if needed

// In a typical bundler setup, you can import files directly. 
// If your builder doesn't support string shader imports, swap these variables out for template strings containing the code blocks above.
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";

export default class Experience {
  constructor(options) {
    this.time = 0;
    this.container = options.dom;

    // Mouse tracking state
    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.targetMouse = new THREE.Vector2(0.5, 0.5);

    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    
    // Core custom systems
    this.setupGUI();
    this.setupTrailTexture();
    this.setupTexture(); // For optional phototexture blending

    this.setupResize();
    this.addObjects();
    this.setupMouseEvents();

    this.tick();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050506);
  }

  setupCamera() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.z = 1.3; // Sit closely to map the flat plane perfectly
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
  }

  setupGUI() {
    this.settings = {
      pixelSize: 3,
      dotColor: "#8affc9",      // Mint-green streak color
      bgColor: "#050506",       // Near-black background
      animatePattern: true,
      waveSpeed: 1.0,
      distortion: 2.0,

      // Nebula streaks
      streakAngle: 35,          // In degrees
      streakScale: 3.5,
      streakSpeed: 0.15,
      streakSharpness: 3.0,
      starDensity: 0.02,
      useTexture: false,

      // Mouse trail configuration
      trailSize: 40,
      trailFade: 0.08,
      trailIntensity: 0.9,
      mouseDistortion: 1.2,
    };

    this.gui = new GUI();

    const pattern = this.gui.addFolder("Pattern");
    pattern.add(this.settings, "pixelSize", 1, 20, 0.5);
    pattern.addColor(this.settings, "dotColor");
    pattern.addColor(this.settings, "bgColor");
    pattern.add(this.settings, "animatePattern");
    pattern.add(this.settings, "waveSpeed", 0, 5, 0.1);
    pattern.add(this.settings, "distortion", 0, 20, 0.1);
    pattern.add(this.settings, "useTexture");

    const nebula = this.gui.addFolder("Nebula Streaks");
    nebula.add(this.settings, "streakAngle", 0, 90, 1);
    nebula.add(this.settings, "streakScale", 0.5, 10, 0.1);
    nebula.add(this.settings, "streakSpeed", 0, 1, 0.01);
    nebula.add(this.settings, "streakSharpness", 1, 8, 0.1);
    nebula.add(this.settings, "starDensity", 0, 0.1, 0.001);

    const trail = this.gui.addFolder("Mouse Trail");
    trail.add(this.settings, "trailSize", 5, 150, 1);
    trail.add(this.settings, "trailFade", 0.01, 0.3, 0.005);
    trail.add(this.settings, "trailIntensity", 0, 1, 0.01);
    trail.add(this.settings, "mouseDistortion", 0, 5, 0.1);
  }

  setupTrailTexture() {
    // Continuous canvas approach for trails
    this.trailSize = 256;
    this.trailCanvas = document.createElement("canvas");
    this.trailCanvas.width = this.trailSize;
    this.trailCanvas.height = this.trailSize;
    this.trailCtx = this.trailCanvas.getContext("2d");

    this.trailTexture = new THREE.CanvasTexture(this.trailCanvas);
  }

  setupTexture() {
    // Generate a default micro-noise fallback pattern so the shader doesn't sample an empty texture unit
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size * 4; i += 4) {
      const val = Math.random() * 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    this.texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    this.texture.needsUpdate = true;
  }

  setupMouseEvents() {
    window.addEventListener("mousemove", (e) => {
      this.targetMouse.x = e.clientX / this.width;
      this.targetMouse.y = 1.0 - (e.clientY / this.height); // Flip Y coordinate space for WebGL alignment
    });
  }

  updateTrail() {
    // Linear interpolation for silky cursor movement
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.15;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.15;

    // Redraw loop on the canvas layer
    this.trailCtx.fillStyle = `rgba(0, 0, 0, ${this.settings.trailFade})`;
    this.trailCtx.fillRect(0, 0, this.trailSize, this.trailSize);

    const x = this.mouse.x * this.trailSize;
    const y = (1.0 - this.mouse.y) * this.trailSize; // Account for 2D vs UV orientation flips

    const gradient = this.trailCtx.createRadialGradient(x, y, 0, x, y, this.settings.trailSize * 0.3);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${this.settings.trailIntensity})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    this.trailCtx.fillStyle = gradient;
    this.trailCtx.beginPath();
    this.trailCtx.arc(x, y, this.settings.trailSize * 0.3, 0, Math.PI * 2);
    this.trailCtx.fill();

    this.trailTexture.needsUpdate = true;
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
    // High-resolution quad filling up our viewport
    const geometry = new THREE.PlaneGeometry(4.5, 5, 64, 64);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      uniforms: {
        uPixelSize: { value: 3.0 },
        uTexture: { value: this.texture },
        uUseTexture: { value: 0.0 },
        uDotColor: { value: new THREE.Color("#8affc9") },
        uBgColor: { value: new THREE.Color("#050506") },
        uTime: { value: 0 },
        uDistortion: { value: 2.0 },
        uWaveSpeed: { value: 1.0 },
        uAnimatePattern: { value: 1.0 },

        uStreakAngle: { value: THREE.MathUtils.degToRad(35) },
        uStreakScale: { value: 3.5 },
        uStreakSpeed: { value: 0.15 },
        uStreakSharpness: { value: 3.0 },
        uStarDensity: { value: 0.02 },

        uTrailTexture: { value: this.trailTexture },
        uMouseDistortion: { value: 1.2 },
      },
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }

  update() {
    this.time += 0.01;
    this.controls.update();
    this.updateTrail();

    if (this.material) {
      const u = this.material.uniforms;
      u.uTime.value = this.time;
      u.uPixelSize.value = this.settings.pixelSize;
      u.uDotColor.value.set(this.settings.dotColor);
      u.uBgColor.value.set(this.settings.bgColor);
      u.uDistortion.value = this.settings.distortion;
      u.uWaveSpeed.value = this.settings.waveSpeed;
      u.uAnimatePattern.value = this.settings.animatePattern ? 1.0 : 0.0;
      u.uUseTexture.value = this.settings.useTexture ? 1.0 : 0.0;

      u.uStreakAngle.value = THREE.MathUtils.degToRad(this.settings.streakAngle);
      u.uStreakScale.value = this.settings.streakScale;
      u.uStreakSpeed.value = this.settings.streakSpeed;
      u.uStreakSharpness.value = this.settings.streakSharpness;
      u.uStarDensity.value = this.settings.starDensity;

      u.uTrailTexture.value = this.trailTexture;
      u.uMouseDistortion.value = this.settings.mouseDistortion;
    }
  }

  tick() {
    this.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.tick.bind(this));
  }

  dispose() {
    this.renderer.dispose();
    this.gui.destroy();
    window.removeEventListener("resize", this.resize.bind(this));
  }
}

// Fire it up 
new Experience({ dom: document.getElementById("container") });