// js/main.js

// ========== CONFIGURACIÓN ==========
const DEBUG_MODE = false;

// ========== VARIABLES GLOBALES ==========
let scene, camera, renderer, controls, stats, game, introScene;
let skyPlane = null;
let audioManager = null;
let animationFrameId = null;

// ========== INICIALIZACIÓN ==========
function init() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (game) {
    game.cleanup?.();
    game = null;
  }
  if (introScene) {
    introScene.dispose();
    introScene = null;
  }

  if (typeof TWEEN !== "undefined") TWEEN.removeAll();

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss?.();
    const canvas = document.getElementById("canvas");
    if (canvas) {
      canvas.parentNode?.replaceChild(canvas.cloneNode(), canvas);
    }
  }

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: document.getElementById("canvas"),
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x0a0a1a);

  try {
    if (typeof Stats !== "undefined") {
      stats = new Stats();
      stats.showPanel(0);
      stats.dom.style.position = "fixed";
      stats.dom.style.bottom = "10px";
      stats.dom.style.left = "10px";
      stats.dom.style.top = "auto";
      stats.dom.style.right = "auto";
      stats.dom.style.zIndex = "1000";
      document.body.appendChild(stats.dom);
    }
  } catch (e) {
    console.warn("Stats error:", e);
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#050510";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0a0a2a");
  gradient.addColorStop(0.25, "#1a0a3a");
  gradient.addColorStop(0.5, "#3a1a5a");
  gradient.addColorStop(0.7, "#6a2a6a");
  gradient.addColorStop(0.85, "#d44a8a");
  gradient.addColorStop(1, "#ffaa44");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 4;
  ctx.shadowColor = "#ffffff";

  for (let i = 0; i < 80; i++) {
    const starX = Math.random() * canvas.width;
    const starY = Math.random() * (canvas.height * 0.4);
    const starSize = Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  const texture = new THREE.CanvasTexture(canvas);
  scene.background = texture;

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 0.85, 1.22);
  camera.lookAt(0, 0.85, 0.9);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enabled = false;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.rotateSpeed = 1.0;
  controls.target.set(0, 0.85, 0.9);

  const ambientLight = new THREE.AmbientLight(0x111122);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(2, 3, 2);
  mainLight.castShadow = true;
  scene.add(mainLight);

  window.addEventListener("resize", onWindowResize);

  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.opacity = "0";
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 500);
  }

  audioManager = new AudioManager();
  window.audioManager = audioManager;

  game = new Game(scene, camera, audioManager);

  buildNormalScene();
  animate();
}

function buildNormalScene() {
  if (introScene) {
    introScene.dispose();
    introScene = null;
  }

  introScene = new IntroScene(scene, camera, renderer, controls, audioManager);
  introScene.build();
  introScene.onStartCallback = () => startIntroAnimation();
}

function startIntroAnimation() {
  if (!introScene) return;
  introScene.isAnimating = true;

  introScene.startCameraAnimation(() => {
    introScene.startFullAnimation();
    setTimeout(() => {
      introScene.startZoomIn(
        { x: 0, y: 1.6, z: 2.6 },
        { x: 0, y: 0.93, z: 1.2 },
        () => transitionToGame(),
      );
    }, 1000);
  }, null);
}

function transitionToGame() {
  if (introScene) {
    introScene.prepareExitToGame();
    introScene.dispose();
    introScene = null;
  }

  if (controls) {
    controls.enabled = false;
    controls.dispose();
    controls = null;
  }

  camera.up.set(0, 1, 0);
  camera.position.set(0, 3.5, -7);
  camera.rotation.set(0, 0, 0);
  camera.quaternion.set(0, 0, 0, 1);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  scene.children.forEach((child) => {
    if (
      child instanceof THREE.DirectionalLight ||
      child instanceof THREE.PointLight
    ) {
      scene.remove(child);
    }
  });

  const ambientLight = new THREE.AmbientLight(0x223344);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffeedd, 0.5);
  mainLight.position.set(0, 10, 5);
  mainLight.target.position.set(0, 0, 40);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.camera.left = -50;
  mainLight.shadow.camera.right = 50;
  mainLight.shadow.camera.top = 50;
  mainLight.shadow.camera.bottom = -50;
  mainLight.shadow.camera.near = 1;
  mainLight.shadow.camera.far = 100;
  scene.add(mainLight);

  const leftFill = new THREE.PointLight(0xffeedd, 0.4);
  leftFill.position.set(-20, 8, 15);
  scene.add(leftFill);

  const rightFill = new THREE.PointLight(0xffeedd, 0.4);
  rightFill.position.set(20, 8, 15);
  scene.add(rightFill);

  const backFill = new THREE.PointLight(0x446688, 0.3);
  backFill.position.set(0, 5, -10);
  scene.add(backFill);

  const renderPass = new THREE.RenderPass(scene, camera);
  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.4,
    0.4,
    0.2,
  );
  const glitchPass = new THREE.GlitchPass();
  glitchPass.goWild = false;
  glitchPass.enabled = false;

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(glitchPass);

  game.setPostProcessing(composer, glitchPass);

  game.activate();

  const hud = document.getElementById("hud");
  if (hud) hud.classList.remove("hidden");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (game && game.composer) {
    game.composer.setSize(window.innerWidth, window.innerHeight);
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (typeof TWEEN !== "undefined" && introScene) TWEEN.update();
  if (controls) controls.update();

  if (game) {
    const now = performance.now();
    const delta = Math.min(0.033, (now - (game._lastTime || now)) / 1000);
    game._lastTime = now;
    game.update(delta);
  }

  if (game && game.composer) {
    game.composer.render();
  } else {
    renderer.render(scene, camera);
  }
  if (stats) stats.update();
}

init();

window.init = init;
window.introScene = introScene;
