// js/intro.js

class IntroScene {
  constructor(scene, camera, renderer, controls, audio) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.objects = [];
    this.armGroup = null;
    this.enterKey = null;
    this.axesHelper = null;
    this.audioManager = audio;

    // Partes del brazo
    this.upperArm = null;
    this.forearm = null;
    this.hand = null;
    this.finger1 = null;
    this.finger2 = null;
    this.finger3 = null;

    // Estado de animación
    this.isPressing = false;
    this.animationLoop = null;
    this.isApproaching = false;
    this.isAnimating = false;

    // Guardar posición inicial del brazo
    this.initialArmPos = null;
    this.initialArmRot = null;
  }

  // ================================================
  // ========== CONSTRUCCIÓN DE LA ESCENA  ==========
  // ================================================

  build() {
    this.clearScene();

    // ========== PARED DE FONDO ==========
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), wallMat);
    wall.position.set(0, 0, -1.5);
    this.scene.add(wall);
    this.objects.push(wall);

    // ========== MESA ==========
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
    });
    const table = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 3.5), tableMat);
    table.position.set(0, -0.4, 0);
    table.receiveShadow = true;
    table.castShadow = true;
    this.scene.add(table);
    this.objects.push(table);

    // ========== MONITOR ==========
    const monitorGroup = new THREE.Group();

    // ========== BASE ==========
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.1, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    );
    stand.position.set(0, -0.45, 0);
    monitorGroup.add(stand);

    // ========== BASE 2 ==========
    const stand2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.3, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    );
    stand2.position.set(0, -0.35, 0);
    monitorGroup.add(stand2);

    // ========== CARCASA ==========
    const casingMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.7,
    });
    const casing = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.8, 0.3),
      casingMat,
    );
    casing.position.set(0, 0.65, 0);
    casing.castShadow = true;
    monitorGroup.add(casing);

    // ========== PANTALLA CON MENÚ ==========
    this.menuTexture = this.createMenuTexture();
    const screenMat = new THREE.MeshStandardMaterial({
      map: this.menuTexture,
      emissive: 0x113355,
      emissiveIntensity: 0.15,
      roughness: 0.3,
      metalness: 0.1,
    });
    this.monitorScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.9, 1.55),
      screenMat,
    );
    this.monitorScreen.position.set(0, 0.65, 0.16);
    monitorGroup.add(this.monitorScreen);

    monitorGroup.position.set(0, 0.2, 0.2);
    monitorGroup.castShadow = true;
    this.setupMonitorClick();
    this.scene.add(monitorGroup);
    this.objects.push(monitorGroup);
    this.monitorGroup = monitorGroup;

    // ========== TECLADO ==========
    const keyboardMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const keyboard = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.08, 0.6),
      keyboardMat,
    );
    keyboard.position.set(0, -0.25, 1.05);
    keyboard.castShadow = true;
    this.scene.add(keyboard);
    this.objects.push(keyboard);

    // ========== ENTER KEY ==========
    this.enterKey = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.06, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x004466 }),
    );
    this.enterKey.position.set(0.3, -0.21, 1.07);
    this.enterKey.castShadow = true;
    this.scene.add(this.enterKey);
    this.objects.push(this.enterKey);

    // ========== BRAZO COMPLETO ==========
    this.createArm();

    this.initialArmPos = this.armGroup.position.clone();
    this.initialArmRot = {
      z: this.armGroup.rotation.z,
      y: this.armGroup.rotation.y,
      x: this.armGroup.rotation.x,
    };

    // ========== LUCES ==========
    const backLight = new THREE.PointLight(0xff44aa, 0.5);
    backLight.position.set(0, 0.8, -1.8);
    this.scene.add(backLight);
    this.objects.push(backLight);

    const fillLight = new THREE.PointLight(0x4488ff, 0.4);
    fillLight.position.set(0.5, 0.3, 1.6);
    this.scene.add(fillLight);
    this.objects.push(fillLight);
  }

  createArm() {
    this.armGroup = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xaa88ff,
      metalness: 0.6,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x331166 });

    // ========== BRAZO SUPERIOR ==========
    this.upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.5, 16),
      metalMat,
    );
    this.upperArm.position.y = -0.15;
    this.armGroup.add(this.upperArm);

    // ========== ANTEBRAZO ==========
    this.forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 0.45, 6),
      metalMat,
    );
    this.forearm.position.y = -0.58;
    this.armGroup.add(this.forearm);

    // ========== MANO ==========
    this.hand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.2), darkMat);
    this.hand.position.set(0.05, -0.85, 0);
    this.hand.rotation.z = -1;
    this.armGroup.add(this.hand);

    // ========== DEDO ÍNDICE ==========
    // Falange 1
    this.finger1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8),
      metalMat,
    );
    this.finger1.position.set(0.1, -0.97, -0.07);
    this.armGroup.add(this.finger1);

    // Falange 2
    this.finger2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8),
      metalMat,
    );
    this.finger2.position.set(0.07, -1.05, -0.07);
    this.finger2.rotation.z = -Math.PI / 4;
    this.armGroup.add(this.finger2);

    // Falange 3
    this.finger3 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.02, 0.08, 8),
      metalMat,
    );
    this.finger3.position.set(0.02, -1.09, -0.07);
    this.finger3.rotation.z = -Math.PI / 3;
    this.armGroup.add(this.finger3);

    this.armGroup.position.set(0.3, 0, 3.1);
    this.armGroup.rotation.z = Math.PI / 2;
    this.armGroup.rotation.y = Math.PI / 2;
    this.scene.add(this.armGroup);
  }

  // ==========================================================
  // ========== FIN DE LA CONSTRUCCIÓN DE LA ESCENA  ==========
  // ==========================================================

  // ==========================================================
  // ========== ANIMACIONES DEL BRAZO =========================
  // ==========================================================

  // ========== RESET DEL BRAZO A POSICIÓN INICIAL ==========
  resetArmPosition() {
    const startState = {
      posX: this.armGroup.position.x,
      posY: this.armGroup.position.y,
      posZ: this.armGroup.position.z,
      rotZ: this.armGroup.rotation.z,
      rotY: this.armGroup.rotation.y,
    };

    const endState = {
      posX: this.initialArmPos.x,
      posY: this.initialArmPos.y,
      posZ: this.initialArmPos.z,
      rotZ: this.initialArmRot.z,
      rotY: this.initialArmRot.y,
    };

    const resetParts = () => {
      this.forearm.position.y = -0.58;
      this.forearm.rotation.z = 0;
      this.hand.position.y = -0.85;
      this.hand.rotation.z = -1;
      this.finger1.position.y = -0.97;
      this.finger1.rotation.z = 0;
      this.finger2.position.y = -1.05;
      this.finger2.rotation.z = -Math.PI / 4;
      this.finger3.position.y = -1.09;
      this.finger3.rotation.z = -Math.PI / 3;
      this.enterKey.position.y = -0.21;
      this.enterKey.material.emissiveIntensity = 0.2;
      this.armGroup.rotation.x = 0;
      this.armGroup.position.y = 0;
    };

    const tween = new TWEEN.Tween(startState)
      .to(endState, 400)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        this.armGroup.position.x = startState.posX;
        this.armGroup.position.y = startState.posY;
        this.armGroup.position.z = startState.posZ;
        this.armGroup.rotation.z = startState.rotZ;
        this.armGroup.rotation.y = startState.rotY;
      })
      .onComplete(() => {
        resetParts();
      });

    tween.start();
  }

  // ========== ANIMACIÓN DE APROXIMACIÓN ==========
  startApproachAnimation() {
    const startState = {
      posX: this.armGroup.position.x,
      posY: this.armGroup.position.y,
      posZ: this.armGroup.position.z,
      rotZ: this.armGroup.rotation.z,
      rotY: this.armGroup.rotation.y,
    };

    const endState = {
      posX: 0.3,
      posY: 0,
      posZ: 2.1,
      rotZ: Math.PI / 2,
      rotY: Math.PI / 2,
    };

    const tween = new TWEEN.Tween(startState)
      .to(endState, 600)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        this.armGroup.position.x = startState.posX;
        this.armGroup.position.y = startState.posY;
        this.armGroup.position.z = startState.posZ;
        this.armGroup.rotation.z = startState.rotZ;
        this.armGroup.rotation.y = startState.rotY;
      });

    tween.start();
  }

  // ========== ANIMACIÓN FLUIDA DEL BRAZO ==========
  startPressAnimation() {
    const restState = {
      armRotZ: Math.PI / 2,
      armRotX: 0,
      armPosY: 0,

      forearmPosY: -0.58,
      forearmRotZ: 0,

      handPosY: -0.85,
      handRotZ: -1,

      finger1PosY: -0.97,
      finger1RotZ: 0,

      finger2PosY: -1.05,
      finger2RotZ: -Math.PI / 4,

      finger3PosY: -1.09,
      finger3RotZ: -Math.PI / 3,
    };

    const pressedState = {
      armRotZ: Math.PI / 2 - 0.35,
      armRotX: 0.2,
      armPosY: -0.03,

      forearmPosY: -0.52,
      forearmRotZ: 0.1,

      handPosY: -0.78,
      handRotZ: -1.2,

      finger1PosY: -0.92,
      finger1RotZ: 0.1,

      finger2PosY: -0.99,
      finger2RotZ: -Math.PI / 3,

      finger3PosY: -1.02,
      finger3RotZ: -Math.PI / 3 - 0.2,
    };

    const keyRest = {
      keyPosY: -0.21,
      keyEmissive: 0.2,
    };

    const keyPressed = {
      keyPosY: -0.235,
      keyEmissive: 0.8,
    };

    const createTween = (fromState, toState, duration, onComplete) => {
      const tween = new TWEEN.Tween(fromState)
        .to(toState, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          this.armGroup.rotation.z = fromState.armRotZ;
          this.armGroup.rotation.x = fromState.armRotX;
          this.armGroup.position.y = fromState.armPosY;

          this.forearm.position.y = fromState.forearmPosY;
          this.forearm.rotation.z = fromState.forearmRotZ;

          this.hand.position.y = fromState.handPosY;
          this.hand.rotation.z = fromState.handRotZ;

          this.finger1.position.y = fromState.finger1PosY;
          this.finger1.rotation.z = fromState.finger1RotZ;

          this.finger2.position.y = fromState.finger2PosY;
          this.finger2.rotation.z = fromState.finger2RotZ;

          this.finger3.position.y = fromState.finger3PosY;
          this.finger3.rotation.z = fromState.finger3RotZ;
        });

      if (onComplete) tween.onComplete(onComplete);
      return tween;
    };

    const createKeyTween = (fromState, toState, duration, onComplete) => {
      const tween = new TWEEN.Tween(fromState)
        .to(toState, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          this.enterKey.position.y = fromState.keyPosY;
          this.enterKey.material.emissiveIntensity = fromState.keyEmissive;
        });

      if (onComplete) tween.onComplete(onComplete);
      return tween;
    };

    const startRest = JSON.parse(JSON.stringify(restState));
    const endPressed = JSON.parse(JSON.stringify(pressedState));
    const endRest = JSON.parse(JSON.stringify(restState));

    const startKeyRest = JSON.parse(JSON.stringify(keyRest));
    const endKeyPressed = JSON.parse(JSON.stringify(keyPressed));
    const endKeyRest = JSON.parse(JSON.stringify(keyRest));

    const tweenDown = createTween(startRest, endPressed, 250);
    const tweenUp = createTween(endPressed, endRest, 300);
    const keyTweenDown = createKeyTween(startKeyRest, endKeyPressed, 120);
    const keyTweenUp = createKeyTween(endKeyPressed, endKeyRest, 150);

    tweenDown.start();

    setTimeout(() => {
      keyTweenDown.start();
    }, 60);

    tweenDown.onComplete(() => {
      setTimeout(() => {
        tweenUp.start();

        setTimeout(() => {
          keyTweenUp.start();
        }, 50);
      }, 30);
    });
  }

  // ========== ANIMACIÓN COMPLETA ==========
  startFullAnimation() {
    this.isAnimating = true;
    this.resetArmPosition();

    setTimeout(() => {
      this.startApproachAnimation();

      setTimeout(() => {
        this.startPressAnimation();
        this.isAnimating = false;
      }, 550);
    }, 250);
  }

  // ==========================================================
  // ========== FIN DE LAS ANIMACIONES DEL BRAZO  =============
  // ==========================================================

  // ==========================================================
  // ========== ANIMACIONES DE LA CÁMARA  =====================
  // ==========================================================

  // ========== ANIMACIÓN COMPLETA DE CÁMARA ==========
  startCameraAnimation(onZoomOutComplete, onZoomInComplete) {
    const startPos = { x: 0, y: 0.85, z: 1.22 };
    const startTarget = { x: 0, y: 0.85, z: 0.9 };

    const endPos = { x: 0, y: 1.6, z: 2.6 };
    const endTarget = { x: 0, y: 0.93, z: 1.2 };

    this.resetCamera();

    this.camera.position.set(startPos.x, startPos.y, startPos.z);
    this.camera.lookAt(startTarget.x, startTarget.y, startTarget.z);

    if (this.controls) {
      this.controls.target.set(startTarget.x, startTarget.y, startTarget.z);
    }

    let startTime = null;
    const duration = 1500;

    const animateZoomOut = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 2);

      const currentX = startPos.x + (endPos.x - startPos.x) * ease;
      const currentY = startPos.y + (endPos.y - startPos.y) * ease;
      const currentZ = startPos.z + (endPos.z - startPos.z) * ease;
      this.camera.position.set(currentX, currentY, currentZ);

      const targetX = startTarget.x + (endTarget.x - startTarget.x) * ease;
      const targetY = startTarget.y + (endTarget.y - startTarget.y) * ease;
      const targetZ = startTarget.z + (endTarget.z - startTarget.z) * ease;
      this.camera.lookAt(targetX, targetY, targetZ);

      if (this.controls) {
        this.controls.target.set(targetX, targetY, targetZ);
      }

      if (t < 1) {
        requestAnimationFrame(animateZoomOut);
      } else {
        if (onZoomOutComplete) onZoomOutComplete();
      }
    };

    requestAnimationFrame(animateZoomOut);
  }

  // ========== ZOOM IN ==========
  startZoomIn(startPos, startTarget, onComplete) {
    const startPosIn = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
    const startTargetIn = new THREE.Vector3(
      startTarget.x,
      startTarget.y,
      startTarget.z,
    );

    this.resetCamera();

    const endPosIn = { x: 0, y: 0.85, z: 1.22 };
    const endTargetIn = { x: 0, y: 0.85, z: 0.9 };

    let startTime = null;
    const durationIn = 600;

    this.startTunnelAnimation(durationIn);

    setTimeout(() => {
      const blackCanvas = document.createElement("canvas");
      blackCanvas.width = 100;
      blackCanvas.height = 100;
      const blackCtx = blackCanvas.getContext("2d");
      blackCtx.fillStyle = "#000000";
      blackCtx.fillRect(0, 0, 100, 100);
      const blackTexture = new THREE.CanvasTexture(blackCanvas);
      this.monitorScreen.material.map = blackTexture;
      this.monitorScreen.material.needsUpdate = true;
    }, 50);

    const animateZoomIn = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / durationIn);
      const ease = t * t;

      const currentX = startPosIn.x + (endPosIn.x - startPosIn.x) * ease;
      const currentY = startPosIn.y + (endPosIn.y - startPosIn.y) * ease;
      const currentZ = startPosIn.z + (endPosIn.z - startPosIn.z) * ease;
      this.camera.position.set(currentX, currentY, currentZ);

      const targetX =
        startTargetIn.x + (endTargetIn.x - startTargetIn.x) * ease;
      const targetY =
        startTargetIn.y + (endTargetIn.y - startTargetIn.y) * ease;
      const targetZ =
        startTargetIn.z + (endTargetIn.z - startTargetIn.z) * ease;
      this.camera.lookAt(targetX, targetY, targetZ);

      if (this.controls) {
        this.controls.target.set(targetX, targetY, targetZ);
      }

      if (t < 1) {
        requestAnimationFrame(animateZoomIn);
      } else {
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateZoomIn);
  }

  // =================================================================
  // ========== FIN DE ANIMACIONES DE LA CÁMARA  =====================
  // =================================================================

  // =================================================================
  // ========== GESTIÓN DEL MENÚ  ====================================
  // =================================================================

  // ========== CREAR TEXTURA DEL MENÚ ==========
  createMenuTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    this.menuCanvas = canvas;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bgImage = new Image();
    bgImage.src = "images/textures/title_background.jpg";

    bgImage.onload = () => {
      this.bgImageLoaded = true;
      this.bgImageObj = bgImage;
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      this.drawMenuOverlay(ctx, canvas, this.currentHoveredButton);
      if (this.menuTexture) {
        this.menuTexture.needsUpdate = true;
      }
    };

    bgImage.onerror = () => {
      this.drawMenuOverlay(ctx, canvas, this.currentHoveredButton);
      if (this.menuTexture) {
        this.menuTexture.needsUpdate = true;
      }
    };

    this.drawMenuOverlay(ctx, canvas, null);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  // ========== ACTUALIZAR TEXTURA DEL MENÚ ==========
  updateMenuTexture(hoveredButton) {
    if (!this.menuCanvas) return;
    const ctx = this.menuCanvas.getContext("2d");
    const canvas = this.menuCanvas;

    if (this.bgImageLoaded && this.bgImageObj) {
      ctx.drawImage(this.bgImageObj, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    this.drawMenuOverlay(ctx, canvas, hoveredButton);
    this.menuTexture.needsUpdate = true;
  }

  // ========== DIBUJAR OVERLAY DEL MENÚ ==========
  drawMenuOverlay(ctx, canvas, hoveredButton = null) {
    const centerX = canvas.width / 2;

    if (this.bgImageLoaded) {
    }

    // Título NEON DESCENT
    ctx.font = 'Bold 72px "Courier New", monospace';
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ffff";
    ctx.fillStyle = "#00ffff";
    ctx.textAlign = "center";
    ctx.fillText("NEON DESCENT", centerX, canvas.height / 2 - 100);

    ctx.font = '48px "Courier New", monospace';
    const buttonWidth = 280;
    const buttonHeight = 55;
    const startX = centerX - buttonWidth / 2;

    // ========== BOTÓN START ==========
    const startY = canvas.height / 2 + 50;
    this.drawButton(
      ctx,
      startX,
      startY - 25,
      buttonWidth,
      buttonHeight,
      "START",
      "#00ffff",
      hoveredButton === "start",
    );

    // ========== BOTÓN OPTIONS ==========
    const optionsY = canvas.height / 2 + 130;
    this.drawButton(
      ctx,
      startX,
      optionsY - 25,
      buttonWidth,
      buttonHeight,
      "OPTIONS",
      "#ff00ff",
      hoveredButton === "options",
    );

    // ========== BOTÓN EXIT ==========
    const exitY = canvas.height / 2 + 210;
    this.drawButton(
      ctx,
      startX,
      exitY - 25,
      buttonWidth,
      buttonHeight,
      "EXIT",
      "#ff4444",
      hoveredButton === "exit",
    );

    ctx.font = '24px "Courier New", monospace';
    ctx.fillStyle = "#2e2e2e";
    ctx.shadowBlur = 0;
    ctx.fillText("AGM - UPV 2026", centerX, canvas.height / 2 + 300);

    this.buttonAreas = {
      start: {
        xMin: startX,
        xMax: startX + buttonWidth,
        yMin: startY - 25,
        yMax: startY + 25,
      },
      options: {
        xMin: startX,
        xMax: startX + buttonWidth,
        yMin: optionsY - 25,
        yMax: optionsY + 25,
      },
      exit: {
        xMin: startX,
        xMax: startX + buttonWidth,
        yMin: exitY - 25,
        yMax: exitY + 25,
      },
    };
  }

  // ========== DIBUJAR UN BOTÓN CON EFECTO HOVER ==========
  drawButton(ctx, x, y, width, height, text, color, isHovered) {
    ctx.strokeStyle = color;
    ctx.lineWidth = isHovered ? 4 : 3;
    ctx.shadowBlur = isHovered ? 15 : 5;
    ctx.shadowColor = color;
    ctx.strokeRect(x, y, width, height);

    if (isHovered) {
      ctx.fillStyle = color + "20";
      ctx.fillRect(x, y, width, height);
    }

    ctx.font = '48px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, x + width / 2, y + height / 2 + 16);
  }

  // ========== CONFIGURACIÓN DE CLICKS Y HOVER EN EL MONITOR ==========
  setupMonitorClick() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.currentHoveredButton = null;

    window.addEventListener("mousemove", (event) => {
      if (this.isAnimating) return;
      if (!this.monitorScreen || !this.menuCanvas) return;

      this.mouse.x =
        (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
      this.mouse.y =
        -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(
        this.monitorScreen,
        true,
      );

      let newHovered = null;

      if (intersects.length > 0) {
        const uv = intersects[0].uv;
        if (uv && this.menuCanvas) {
          const x = uv.x * this.menuCanvas.width;
          const y = (1 - uv.y) * this.menuCanvas.height;

          if (this.buttonAreas) {
            if (
              x > this.buttonAreas.start.xMin &&
              x < this.buttonAreas.start.xMax &&
              y > this.buttonAreas.start.yMin &&
              y < this.buttonAreas.start.yMax
            ) {
              newHovered = "start";
            } else if (
              x > this.buttonAreas.options.xMin &&
              x < this.buttonAreas.options.xMax &&
              y > this.buttonAreas.options.yMin &&
              y < this.buttonAreas.options.yMax
            ) {
              newHovered = "options";
            } else if (
              x > this.buttonAreas.exit.xMin &&
              x < this.buttonAreas.exit.xMax &&
              y > this.buttonAreas.exit.yMin &&
              y < this.buttonAreas.exit.yMax
            ) {
              newHovered = "exit";
            }
          }
        }
      }

      if (newHovered !== this.currentHoveredButton) {
        this.currentHoveredButton = newHovered;
        this.updateMenuTexture(this.currentHoveredButton);
      }
    });

    window.addEventListener("click", (event) => {
      if (this.isAnimating) return;
      if (!this.monitorScreen || !this.menuCanvas) return;

      this.mouse.x =
        (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
      this.mouse.y =
        -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(
        this.monitorScreen,
        true,
      );

      if (intersects.length > 0) {
        const uv = intersects[0].uv;
        if (uv && this.menuCanvas) {
          const x = uv.x * this.menuCanvas.width;
          const y = (1 - uv.y) * this.menuCanvas.height;

          if (this.buttonAreas) {
            if (
              x > this.buttonAreas.start.xMin &&
              x < this.buttonAreas.start.xMax &&
              y > this.buttonAreas.start.yMin &&
              y < this.buttonAreas.start.yMax
            ) {
              if (this.onStartCallback) this.onStartCallback();
            } else if (
              x > this.buttonAreas.options.xMin &&
              x < this.buttonAreas.options.xMax &&
              y > this.buttonAreas.options.yMin &&
              y < this.buttonAreas.options.yMax
            ) {
              this.showOptionsMenu();
            } else if (
              x > this.buttonAreas.exit.xMin &&
              x < this.buttonAreas.exit.xMax &&
              y > this.buttonAreas.exit.yMin &&
              y < this.buttonAreas.exit.yMax
            ) {
              if (confirm("Exit NEON DESCENT?")) window.close();
            }
          }
        }
      }
    });
  }

  // =================================================================
  // ========== FIN DE LA GESTIÓN DEL MENÚ  ==========================
  // =================================================================

  // =================================================================
  // ========== GESTIÓN DEL TÚNEL  ===================================
  // =================================================================

  // ========== CREAR TEXTURA DE TÚNEL ==========
  createTunnelTexture(progress = 0) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const centerGlowSize = 120 + progress * 180;

    // ========== CUADRÍCULA CONVERGENTE ==========

    const numLines = 16;
    const numRings = 12;

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.2;

    // ========== LÍNEAS RADIALES ==========
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;

      const startX = centerX + Math.cos(angle) * canvas.width * 0.7;
      const startY = centerY + Math.sin(angle) * canvas.height * 0.7;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(centerX, centerY);

      const intensity = 0.3 + Math.sin(angle * 3) * 0.1;
      ctx.strokeStyle = `rgba(0, 255, 170, ${0.25 + intensity * 0.2})`;
      ctx.stroke();
    }

    // ========== ANILLOS CONCÉNTRICOS ==========
    for (let i = 1; i <= numRings; i++) {
      const t = i / numRings;
      const radius =
        Math.pow(t, 1.5) * Math.min(canvas.width, canvas.height) * 0.65;

      if (radius < 5) continue;

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius, radius * 0.9, 0, 0, Math.PI * 2);

      const intensity = 0.4 + (1 - t) * 0.5;
      ctx.strokeStyle = `rgba(0, 255, 170, ${intensity * 0.7})`;
      ctx.stroke();
    }

    // ========== LÍNEAS DE CUADRÍCULA HORIZONTALES ==========
    const numHorizLines = 10;
    for (let i = -numHorizLines; i <= numHorizLines; i++) {
      const t = Math.abs(i) / numHorizLines;
      const yOffset = Math.pow(t, 1.2) * canvas.height * 0.7;

      if (i === 0) continue;

      let y;
      if (i < 0) y = centerY - yOffset;
      else y = centerY + yOffset;

      if (y < 0 || y > canvas.height) continue;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(centerX, y * 0.8 + centerY * 0.2, centerX, centerY);
      ctx.moveTo(canvas.width, y);
      ctx.quadraticCurveTo(centerX, y * 0.8 + centerY * 0.2, centerX, centerY);

      const intensity = 0.2 + (1 - t) * 0.4;
      ctx.strokeStyle = `rgba(0, 200, 255, ${intensity * 0.6})`;
      ctx.stroke();
    }

    // ========== LÍNEAS DE CUADRÍCULA VERTICALES ==========
    const numVertLines = 10;
    for (let i = -numVertLines; i <= numVertLines; i++) {
      const t = Math.abs(i) / numVertLines;
      const xOffset = Math.pow(t, 1.2) * canvas.width * 0.7;

      if (i === 0) continue;

      let x;
      if (i < 0) x = centerX - xOffset;
      else x = centerX + xOffset;

      if (x < 0 || x > canvas.width) continue;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x * 0.8 + centerX * 0.2, centerY, centerX, centerY);
      ctx.moveTo(x, canvas.height);
      ctx.quadraticCurveTo(x * 0.8 + centerX * 0.2, centerY, centerX, centerY);

      const intensity = 0.2 + (1 - t) * 0.4;
      ctx.strokeStyle = `rgba(0, 200, 255, ${intensity * 0.6})`;
      ctx.stroke();
    }

    // ========== NÚMEROS POR TODA LA PANTALLA ==========
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.shadowBlur = 1;
    ctx.shadowColor = "#0fa";

    for (let i = 0; i < 40; i++) {
      let x = Math.random() * canvas.width;
      let y = Math.random() * canvas.height;

      const dx = centerX - x;
      const dy = centerY - y;
      const distToCenter = Math.hypot(dx, dy);

      const moveFactor = progress * 0.4;
      x = x + dx * moveFactor;
      y = y + dy * moveFactor;

      if (x < 0) x = 0;
      if (x > canvas.width) x = canvas.width;
      if (y < 0) y = 0;
      if (y > canvas.height) y = canvas.height;

      let char;
      const rand = Math.random();
      if (rand < 0.45) char = "0";
      else if (rand < 0.8) char = "1";
      else {
        const hex = ["A", "B", "C", "D", "E", "F"];
        char = hex[Math.floor(Math.random() * hex.length)];
      }

      let alpha;
      if (distToCenter < centerGlowSize * 0.8) {
        alpha = 0.7 + Math.random() * 0.3;
      } else {
        alpha = 0.35 + Math.random() * 0.35;
      }

      let fontSize;
      if (distToCenter < centerGlowSize * 0.8) {
        fontSize = 16 + Math.floor(Math.random() * 10);
      } else {
        fontSize = 12 + Math.floor(Math.random() * 8);
      }

      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = `rgba(0, 255, 170, ${alpha})`;
      ctx.fillText(char, x, y);
    }

    // ========== SEGUNDA CAPA DE NÚMEROS ==========
    ctx.font = '10px "Courier New", monospace';
    for (let i = 0; i < 40; i++) {
      let x = Math.random() * canvas.width;
      let y = Math.random() * canvas.height;

      const dx = centerX - x;
      const dy = centerY - y;

      const moveFactor = progress * 0.2;
      x = x + dx * moveFactor;
      y = y + dy * moveFactor;

      if (x < 0) x = 0;
      if (x > canvas.width) x = canvas.width;
      if (y < 0) y = 0;
      if (y > canvas.height) y = canvas.height;

      const char = Math.random() > 0.5 ? "0" : "1";
      const alpha = 0.2 + Math.random() * 0.25;
      ctx.fillStyle = `rgba(0, 200, 150, ${alpha})`;
      ctx.fillText(char, x, y);
    }

    // ========== NÚMEROS GRANDES ==========
    ctx.font = 'bold 24px "Courier New", monospace';
    for (let i = 0; i < 20; i++) {
      let x = Math.random() * canvas.width;
      let y = Math.random() * canvas.height;

      const dx = centerX - x;
      const dy = centerY - y;
      const distToCenter = Math.hypot(dx, dy);

      if (distToCenter < centerGlowSize * 0.7) continue;

      const moveFactor = progress * 0.25;
      x = x + dx * moveFactor;
      y = y + dy * moveFactor;

      if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) continue;

      const char = Math.random() > 0.7 ? "0" : "1";
      ctx.fillStyle = `rgba(0, 255, 170, 0.5)`;
      ctx.fillText(char, x, y);
    }

    // ========== CENTRO MÁS GRANDE Y BRILLANTE ==========
    const centerGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      centerGlowSize,
    );
    centerGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    centerGradient.addColorStop(0.1, "rgba(255, 255, 255, 0.95)");
    centerGradient.addColorStop(0.2, "rgba(0, 255, 170, 0.9)");
    centerGradient.addColorStop(0.4, "rgba(0, 255, 170, 0.6)");
    centerGradient.addColorStop(0.6, "rgba(0, 200, 150, 0.3)");
    centerGradient.addColorStop(0.8, "rgba(0, 100, 80, 0.1)");
    centerGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = centerGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(centerX, centerY, centerGlowSize * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, centerGlowSize * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fill();

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // ========== ANIMACIÓN DE TÚNEL ==========
  startTunnelAnimation(duration) {
    let startTime = null;
    let progress = 0;
    let lastFrameTime = 0;
    const frameThrottle = 1000 / 30;

    const animateTunnel = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      progress = Math.min(1, elapsed / duration);

      if (timestamp - lastFrameTime >= frameThrottle || progress >= 1) {
        lastFrameTime = timestamp;
        const easeProgress = 1 - Math.pow(1 - progress, 2);

        const tunnelTexture = this.createTunnelTexture(easeProgress);
        if (this.monitorScreen && this.monitorScreen.material) {
          this.monitorScreen.material.map = tunnelTexture;
          this.monitorScreen.material.needsUpdate = true;
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animateTunnel);
      }
    };

    requestAnimationFrame(animateTunnel);
  }

  // =================================================================
  // ========== FIN DE LA GESTIÓN DEL TÚNEL  =========================
  // =================================================================

  showOptionsMenu() {
    if (!this.optionsOverlay) {
      this.createOptionsMenu();
    }
    this.optionsOverlay.classList.remove("hidden");

    const audio = window.game?.audio;
    if (this.audioManager) {
      const musicSlider = document.getElementById("music-volume");
      const sfxSlider = document.getElementById("sfx-volume");
      const musicValue = document.getElementById("music-value");
      const sfxValue = document.getElementById("sfx-value");

      musicSlider.value = this.audioManager.getMusicVolume();
      sfxSlider.value = this.audioManager.getSFXVolume();
      musicValue.textContent =
        Math.round(this.audioManager.getMusicVolume() * 100) + "%";
      sfxValue.textContent =
        Math.round(this.audioManager.getSFXVolume() * 100) + "%";
    }
  }

  createOptionsMenu() {
    const overlay = document.createElement("div");
    overlay.className = "options-overlay";
    overlay.innerHTML = `
    <div class="options-panel">
      <button class="close-btn" id="close-options">✕</button>
      <div class="options-title">OPTIONS</div>
      
      <div class="volume-control">
        <div class="volume-label">
          <span>MUSIC</span>
          <span class="volume-value" id="music-value">30%</span>
        </div>
        <input type="range" id="music-volume" class="volume-slider" min="0" max="1" step="0.01" value="0.3">
      </div>
      
      <div class="volume-control">
        <div class="volume-label">
          <span>SFX</span>
          <span class="volume-value" id="sfx-value">50%</span>
        </div>
        <input type="range" id="sfx-volume" class="volume-slider" min="0" max="1" step="0.01" value="0.5">
      </div>
      
      <div class="options-footer">
        NEON DESCENT v1.0
      </div>
    </div>
  `;

    document.body.appendChild(overlay);
    this.optionsOverlay = overlay;

    // Event listeners
    const closeBtn = overlay.querySelector("#close-options");
    closeBtn.addEventListener("click", () => {
      overlay.classList.add("hidden");
    });

    // Cerrar al hacer clic fuera del panel
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.add("hidden");
      }
    });

    // Sliders
    const musicSlider = overlay.querySelector("#music-volume");
    const sfxSlider = overlay.querySelector("#sfx-volume");
    const musicValue = overlay.querySelector("#music-value");
    const sfxValue = overlay.querySelector("#sfx-value");

    musicSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      musicValue.textContent = Math.round(val * 100) + "%";
      if (this.audioManager) {
        this.audioManager.setMusicVolume(val);
      }
    });

    sfxSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      sfxValue.textContent = Math.round(val * 100) + "%";
      if (this.audioManager) {
        this.audioManager.setSFXVolume(val);
      }
    });
  }

  // =================================================================
  // ==========  UTILIDADES  =========================================
  // =================================================================

  clearScene() {
    this.objects.forEach((obj) => {
      if (obj.parent) this.scene.remove(obj);
    });
    this.objects = [];
  }

  dispose() {
    this.clearScene();

    if (this.armGroup) this.scene.remove(this.armGroup);

    window.removeEventListener("mousemove", this.mouseMoveHandler);
    window.removeEventListener("click", this.clickHandler);
  }

  resetCamera() {
    this.camera.rotation.set(0, 0, 0);
    this.camera.quaternion.set(0, 0, 0, 1);
    this.camera.up.set(0, 1, 0);
  }

  prepareExitToGame() {
    TWEEN.removeAll();
    this.isAnimating = false;
    this.isApproaching = false;
    this.isPressing = false;

    this.camera.up.set(0, 1, 0);
    this.camera.rotation.set(0, 0, 0);
    this.camera.quaternion.set(0, 0, 0, 1);
    this.camera.position.set(0, 3.5, -7);
    this.camera.updateMatrixWorld(true);
  }
}

// =================================================================
// ========== FIN DE UTILIDADES  ===================================
// =================================================================

window.IntroScene = IntroScene;
