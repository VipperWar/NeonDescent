// js/game.js

class Game {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this._lastTime = performance.now();

    // ====== ESTADÍSTICAS ======
    this.bits = [];
    this.bitsCount = 0;
    this.integrity = 100;
    this.distance = 0;

    // ====== OVERCLOCK ======
    this.overclockActive = false;
    this.overclockTimer = 0;
    this.overclockDuration = 10;
    this.savedForwardSpeed = 0;

    // ====== PUNTUACIÓN ======
    this.platformsPassed = 0;
    this.score = 0;

    // ====== CARRILES ======
    this.lanes = [-6, -3, 0, 3, 6];
    this.laneWidth = 3.0;
    this.currentZ = 0;
    this.chunkLength = 30;

    // ====== PATRONES ======
    this.patterns = [
      { name: "simpleLeft", lanes: [0] },
      { name: "simpleCenter", lanes: [2] },
      { name: "simpleRight", lanes: [4] },
      { name: "all", lanes: [0, 1, 2, 3, 4] },
      { name: "leftSide", lanes: [0, 1, 2] },
      { name: "rightSide", lanes: [2, 3, 4] },
      { name: "centerGap", lanes: [0, 1, 3, 4] },
      { name: "outerOnly", lanes: [0, 4] },
      { name: "zigzag", lanes: [0, 2, 4] },
      { name: "stairsLeft", lanes: [0, 1] },
      { name: "stairsRight", lanes: [3, 4] },
      { name: "narrow", lanes: [1, 3] },
      { name: "wideGap", lanes: [0, 2, 4] },
      { name: "suddenSingle", lanes: () => [Math.random() < 0.5 ? 0 : 4] },
    ];

    // ====== FÍSICAS ======
    this.world = new CANNON.World();
    this.world.gravity = new CANNON.Vec3(0, -22, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();

    this.playerMaterial = new CANNON.Material("player");
    this.platformMaterial = new CANNON.Material("platform");

    const playerPlatformContact = new CANNON.ContactMaterial(
      this.playerMaterial,
      this.platformMaterial,
      { friction: 0.4, restitution: 0 },
    );
    this.world.addContactMaterial(playerPlatformContact);

    // ====== DATA ======
    this.platforms = [];
    this.obstacles = [];

    // ====== PLAYER ======
    this.player = new Player(this.scene, this.world, this.playerMaterial);

    // ====== INPUT ======
    this.input = { left: false, right: false };
    this.setupInput();

    // ====== INIT TRACK ======
    this.initTrack();

    // ====== TRAIL ======
    this.createTrailEffect();
  }

  setupInput() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "a" || e.key === "ArrowLeft") {
        this.input.left = true;
        e.preventDefault();
      }
      if (e.key === "d" || e.key === "ArrowRight") {
        this.input.right = true;
        e.preventDefault();
      }
      if (e.key === " " && this.player) {
        this.player.jump();
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "a" || e.key === "ArrowLeft") this.input.left = false;
      if (e.key === "d" || e.key === "ArrowRight") this.input.right = false;
    });
  }

  updatePlatformTouched() {
    const contacts = this.world.contacts;
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const bi = contact.bi;
      const bj = contact.bj;

      let platformData = null;
      if (bi.userData?.type === "player" && bj.userData?.type === "platform") {
        platformData = bj.userData.platformRef;
      } else if (
        bj.userData?.type === "player" &&
        bi.userData?.type === "platform"
      ) {
        platformData = bi.userData.platformRef;
      }

      if (platformData && !platformData.touched) {
        platformData.touched = true;
        if (platformData.type === "boost") {
          this.player.applyBoost(1.6, 2.0);
        }
      }
    }
  }

  initTrack() {
    for (let i = 0; i < 5; i++) {
      this.generateChunk();
    }
  }

  spawnPlatform(x, zMin, length, width = this.laneWidth, isBoost) {
    const z = zMin + length / 2;
    const height = 0.5;
    const color = isBoost ? 0x00aa33 : 0x0a0a1a;
    const emissive = isBoost ? 0x00ff44 : 0x001133;

    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: emissive,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.4,
    });

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, length),
      material,
    );
    mesh.position.set(x, height / 2, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);

    const body = new CANNON.Body({
      mass: 0,
      material: this.platformMaterial,
      position: new CANNON.Vec3(x, height / 2, z),
    });
    body.addShape(
      new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, length / 2)),
    );
    this.world.addBody(body);

    const platformData = {
      body,
      mesh,
      zMin,
      zMax: zMin + length,
      passed: false,
      touched: false,
      type: isBoost ? "boost" : "normal",
    };

    body.userData = { type: "platform", platformRef: platformData };
    this.platforms.push(platformData);
  }

  spawnObstacle(x, zMin, zMax) {
    const width = 1.0;
    const height = 1.0;
    const depth = 1.0;

    const z = zMin + 5 + Math.random() * (zMax - zMin - 10);
    const y = height / 2 + 0.5;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0x440000,
      emissiveIntensity: 1.2,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    this.obstacles.push({
      mesh,
      width,
      height,
      depth,
      position: mesh.position,
    });
  }

  spawnBit(x, zMin, zMax) {
    const geometry = new THREE.OctahedronGeometry(0.4);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0x442200,
      emissiveIntensity: 1.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = false;

    const z = zMin + 5 + Math.random() * (zMax - zMin - 10);
    const y = 0.8;

    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.bits.push({
      mesh,
      position: mesh.position,
      radius: 0.5,
      collected: false,
    });
  }

  activateOverclock() {
    if (this.overclockActive) return;
    this.savedForwardSpeed = this.player.forwardSpeed;
    this.player.forwardSpeed *= 1.3;
    this.overclockActive = true;
    this.overclockTimer = this.overclockDuration;
    this.bitsCount = 0;
    this.player.mesh.material.emissive.setHex(0xffaa00);
  }

  deactivateOverclock() {
    this.overclockActive = false;
    this.player.forwardSpeed = this.savedForwardSpeed;
    this.player.mesh.material.emissive.setHex(0x0088aa);
  }

  checkObstacleCollisions() {
    const pos = this.player.body.position;
    const r = this.player.radius;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      const p = obs.position;
      const h = { w: obs.width / 2, h: obs.height / 2, d: obs.depth / 2 };
      const cx = Math.max(p.x - h.w, Math.min(pos.x, p.x + h.w));
      const cy = Math.max(p.y - h.h, Math.min(pos.y, p.y + h.h));
      const cz = Math.max(p.z - h.d, Math.min(pos.z, p.z + h.d));
      const dx = pos.x - cx,
        dy = pos.y - cy,
        dz = pos.z - cz;
      if (dx * dx + dy * dy + dz * dz < r * r) {
        if (!this.overclockActive) {
          this.integrity = Math.max(0, this.integrity - 25);
          this.scene.remove(obs.mesh);
          this.obstacles.splice(i, 1);
          this.player.mesh.material.emissive.setHex(0xff0000);
          setTimeout(() => {
            if (this.player?.mesh?.material)
              this.player.mesh.material.emissive.setHex(
                this.overclockActive ? 0xffaa00 : 0x0088aa,
              );
          }, 150);
          if (this.integrity <= 0) {
            this.gameOver();
            return;
          }
        } else {
          this.scene.remove(obs.mesh);
          this.obstacles.splice(i, 1);
          this.player.mesh.material.emissiveIntensity = 2.5;
          setTimeout(() => {
            if (this.player?.mesh?.material)
              this.player.mesh.material.emissiveIntensity = 1.5;
          }, 100);
        }
      }
    }
  }

  checkBitCollection() {
    const pos = this.player.body.position;
    const r = this.player.radius;
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const bit = this.bits[i];
      const dx = pos.x - bit.position.x,
        dy = pos.y - bit.position.y,
        dz = pos.z - bit.position.z;
      if (dx * dx + dy * dy + dz * dz < (r + bit.radius) ** 2) {
        if (!this.overclockActive) this.bitsCount++;
        this.scene.remove(bit.mesh);
        this.bits.splice(i, 1);
        this.player.mesh.material.emissiveIntensity = 2.0;
        setTimeout(() => {
          if (this.player?.mesh?.material)
            this.player.mesh.material.emissiveIntensity = 1.0;
        }, 100);
        if (this.bitsCount >= 10 && !this.overclockActive)
          this.activateOverclock();
      }
    }
  }

  checkPlatformPassed() {
    const playerZ = this.player.body.position.z;
    for (let platform of this.platforms) {
      if (!platform.passed && playerZ > platform.zMax) {
        platform.passed = true;
        if (platform.touched) {
          this.platformsPassed++;
          this.score += this.overclockActive ? 2 : 1;
        }
      }
    }
  }

  selectPattern(distance) {
    let available;
    if (distance < 60)
      available = ["simpleCenter", "all", "leftSide", "rightSide"];
    else if (distance < 120)
      available = [
        "simpleCenter",
        "simpleLeft",
        "simpleRight",
        "all",
        "leftSide",
        "rightSide",
        "centerGap",
        "outerOnly",
        "zigzag",
      ];
    else
      available = [
        "simpleCenter",
        "simpleLeft",
        "simpleRight",
        "all",
        "leftSide",
        "rightSide",
        "centerGap",
        "outerOnly",
        "zigzag",
        "stairsLeft",
        "stairsRight",
        "narrow",
        "wideGap",
        "suddenSingle",
      ];
    const name = available[Math.floor(Math.random() * available.length)];
    return this.patterns.find((p) => p.name === name);
  }

  generateChunk() {
    const pattern = this.selectPattern(this.distance);
    const active = pattern.lanes;
    const startZ = this.currentZ;
    const endZ = startZ + this.chunkLength;

    const boostLane =
      Math.random() < 0.2
        ? active[Math.floor(Math.random() * active.length)]
        : null;

    for (let idx of active) {
      const x = this.lanes[idx];
      const isBoost = idx === boostLane;
      this.spawnPlatform(x, startZ, this.chunkLength, this.laneWidth, isBoost);
    }

    const obsProb = Math.min(0.5, 0.1 + (this.distance / 1000) * 0.4);
    for (let idx of active) {
      if (Math.random() < obsProb)
        this.spawnObstacle(this.lanes[idx], startZ, endZ);
    }

    for (let idx of active) {
      if (Math.random() < 0.3) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let j = 0; j < count; j++)
          this.spawnBit(this.lanes[idx], startZ, endZ);
      }
    }

    this.currentZ = endZ;
  }

  createTrailEffect() {
    const pc = 300;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(pc * 3);
    for (let i = 0; i < pc; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00aaff,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.trail = new THREE.Points(geo, mat);
    this.trailPositions = [];
    this.scene.add(this.trail);
  }

  updateTrail() {
    if (!this.player) return;
    const playerPos = this.player.body.position;
    this.trailPositions.unshift(playerPos.clone());

    const maxLength = Math.floor(25 + this.player.forwardSpeed * 1.5);
    while (this.trailPositions.length > maxLength) {
      this.trailPositions.pop();
    }

    const positions = this.trail.geometry.attributes.position.array;
    const intensity = Math.min(
      1,
      this.player.forwardSpeed / this.player.maxForwardSpeed,
    );

    this.trail.material.size = 0.08 + intensity * 0.1;
    this.trail.material.opacity = 0.4 + intensity * 0.5;

    for (
      let i = 0;
      i < this.trailPositions.length && i < positions.length / 3;
      i++
    ) {
      const pos = this.trailPositions[i];
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y - 0.15;
      positions[i * 3 + 2] = pos.z;
    }

    for (let i = this.trailPositions.length; i < positions.length / 3; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
    }

    this.trail.geometry.attributes.position.needsUpdate = true;
  }

  updateTrack() {
    const playerZ = this.player.body.position.z;
    while (this.currentZ < playerZ + 150) {
      this.generateChunk();
    }

    this.platforms = this.platforms.filter((p) => {
      if (p.zMax < playerZ - 40) {
        this.world.removeBody(p.body);
        this.scene.remove(p.mesh);
        return false;
      }
      return true;
    });

    this.obstacles = this.obstacles.filter((obs) => {
      if (obs.position.z < playerZ - 40) {
        this.scene.remove(obs.mesh);
        return false;
      }
      return true;
    });

    this.bits = this.bits.filter((bit) => {
      if (bit.position.z < playerZ - 40) {
        this.scene.remove(bit.mesh);
        return false;
      }
      return true;
    });
  }

  updateHUD() {
    const speedValue = document.getElementById("speed-value");
    const distanceValue = document.getElementById("distance-value");
    const bitsValue = document.getElementById("bits-value");
    const integrityFill = document.getElementById("integrity-fill");
    const platformsValue = document.getElementById("platforms-value");

    if (speedValue) {
      const speedMbps = Math.floor(this.player.forwardSpeed * 10);
      speedValue.textContent = speedMbps;
      if (speedMbps > 180) speedValue.style.color = "#ff4444";
      else if (speedMbps > 100) speedValue.style.color = "#ffaa44";
      else speedValue.style.color = "#44ff44";
    }

    if (distanceValue) {
      this.distance = Math.floor(this.player.body.position.z / 8);
      distanceValue.textContent = this.distance;
    }

    if (bitsValue) bitsValue.textContent = this.bitsCount;
    if (platformsValue) platformsValue.textContent = this.platformsPassed;

    if (integrityFill) {
      integrityFill.style.width = `${Math.max(0, this.integrity)}%`;
      if (this.integrity < 30) integrityFill.style.backgroundColor = "#ff4444";
      else if (this.integrity < 60)
        integrityFill.style.backgroundColor = "#ffaa44";
      else integrityFill.style.backgroundColor = "#44ff44";
    }
  }

  update(delta) {
    if (delta > 0.033) delta = 0.033;

    if (this.overclockActive) {
      this.overclockTimer -= delta;
      if (this.overclockTimer <= 0) this.deactivateOverclock();
    } else {
      if (this.player.forwardSpeed < this.player.maxForwardSpeed) {
        this.player.forwardSpeed += this.player.acceleration * delta;
      }
    }

    this.player.updateInput(this.input);
    this.player.updateForwardMovement(delta);
    this.player.updateTimers(delta);
    this.world.step(1 / 60, delta, 10);
    this.updatePlatformTouched();
    this.checkObstacleCollisions();
    this.checkBitCollection();
    this.checkPlatformPassed();

    this.bits.forEach((b) => {
      b.mesh.rotation.y += 0.02;
      b.mesh.rotation.x += 0.01;
      b.mesh.position.y = 0.8 + Math.sin(performance.now() * 0.005) * 0.1;
    });

    if (this.player.isFalling()) {
      this.gameOver();
      return;
    }

    this.player.updateVisuals(delta);
    this.updateTrail();
    this.updateCamera(delta);
    this.updateTrack();
    this.updateHUD();
  }

  updateCamera(delta) {
    const p = this.player.body.position;
    const targetPos = new THREE.Vector3(p.x * 0.4, p.y + 3, p.z - 7);

    if (!this._cameraReady) {
      this.camera.position.copy(targetPos);
      this._cameraReady = true;
    } else {
      const smooth = 1 - Math.exp(-8 * delta);
      this.camera.position.lerp(targetPos, smooth);
    }

    this.camera.lookAt(p.x, p.y + 0.5, p.z + 10);
    const tilt = this.player.body.velocity.x * 0.012;
    const clampedTilt = Math.min(0.12, Math.max(-0.12, tilt));
    const tiltQuat = new THREE.Quaternion();
    tiltQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -clampedTilt);
    this.camera.quaternion.multiply(tiltQuat);
  }

  gameOver() {
    const finalDistance = document.getElementById("final-distance");
    const finalSpeed = document.getElementById("final-speed");
    const finalScore = document.getElementById("final-score");

    if (finalDistance) finalDistance.textContent = this.distance;
    if (finalSpeed)
      finalSpeed.textContent = Math.floor(this.player.forwardSpeed * 10);
    if (finalScore) finalScore.textContent = this.score;

    const gameoverScreen = document.getElementById("gameover-screen");
    if (gameoverScreen) gameoverScreen.classList.remove("hidden");

    const restartBtn = document.getElementById("btn-restart");
    if (restartBtn) {
      restartBtn.onclick = () => setTimeout(() => this.resetGame(), 150);
    }
  }

  resetGame() {
    this.integrity = 100;
    this.distance = 0;
    this.platformsPassed = 0;
    this.score = 0;

    this.overclockActive = false;
    this.overclockTimer = 0;

    this.platforms.forEach((p) => {
      this.world.removeBody(p.body);
      this.scene.remove(p.mesh);
    });
    this.platforms = [];

    this.obstacles.forEach((obs) => this.scene.remove(obs.mesh));
    this.obstacles = [];

    this.bits.forEach((bit) => this.scene.remove(bit.mesh));
    this.bits = [];
    this.bitsCount = 0;

    this.currentZ = 0;
    this.initTrack();

    this.player.reset();
    this.player.mesh.material.emissive.setHex(0x0088aa);

    this._cameraReady = false;
    this.trailPositions = [];

    const gameoverScreen = document.getElementById("gameover-screen");
    if (gameoverScreen) gameoverScreen.classList.add("hidden");
  }
}

window.Game = Game;

// js/player.js

class Player {
  constructor(scene, world, playerMaterial) {
    this.scene = scene;
    this.world = world;
    this.playerMaterial = playerMaterial;
    this.radius = 0.5;

    this.forwardSpeed = 0;
    this.maxForwardSpeed = 200;
    this.acceleration = 1.2;
    this.boostMultiplier = 1.0;
    this.boostTimer = 0;

    this.rayResult = new CANNON.RaycastResult();
    this.groundRayLength = this.radius + 0.15;
    this.input = { left: false, right: false };

    this.isGrounded = false;
    this.coyoteTime = 0.08;
    this.coyoteTimer = 0;
    this.jumpBufferTime = 0.1;
    this.jumpBufferTimer = 0;
    this.fallMultiplier = 1.5;

    this.createPhysicsBody();
    this.createVisualMesh();
    this.createLight();
  }

  createPhysicsBody() {
    this.body = new CANNON.Body({
      mass: 1,
      material: this.playerMaterial,
      shape: new CANNON.Sphere(this.radius),
      position: new CANNON.Vec3(0, this.radius + 0.5, 0),
    });

    this.body.material.friction = 0.3;
    this.body.angularDamping = 0.5;
    this.body.linearDamping = 0.2;
    this.world.addBody(this.body);
    this.body.userData = { type: "player", ref: this };
  }

  createVisualMesh() {
    const geo = new THREE.SphereGeometry(this.radius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x0088aa,
      metalness: 0.9,
      roughness: 0.2,
      emissiveIntensity: 1,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.copy(this.body.position);
    this.scene.add(this.mesh);
  }

  createLight() {
    this.light = new THREE.PointLight(0x00aaff, 1.5, 10);
    this.light.castShadow = true;
    this.scene.add(this.light);
  }

  updateInput(input) {
    this.input = input;

    const lateralForce = 18;
    if (this.input.left) {
      this.body.applyForce(
        new CANNON.Vec3(lateralForce, 0, 0),
        this.body.position,
      );
    }
    if (this.input.right) {
      this.body.applyForce(
        new CANNON.Vec3(-lateralForce, 0, 0),
        this.body.position,
      );
    }

    const maxLateralSpeed = 10;
    if (Math.abs(this.body.velocity.x) > maxLateralSpeed) {
      this.body.velocity.x = Math.sign(this.body.velocity.x) * maxLateralSpeed;
    }
  }

  updateForwardMovement(delta) {
    this.body.position.z += this.forwardSpeed * delta;
  }

  updateVisuals() {
    this.mesh.position.copy(this.body.position);
    this.mesh.rotation.set(0, 0, 0);

    this.light.position.copy(this.body.position);
    const intensity = 0.8 + (this.forwardSpeed / this.maxForwardSpeed) * 1.2;
    this.light.intensity = Math.min(2.5, intensity);

    const emissiveIntensity =
      0.5 + (this.forwardSpeed / this.maxForwardSpeed) * 1.5;
    this.mesh.material.emissiveIntensity = Math.min(1.5, emissiveIntensity);
  }

  checkGrounded() {
    const from = this.body.position.clone();
    const to = new CANNON.Vec3(
      this.body.position.x,
      this.body.position.y - this.groundRayLength,
      this.body.position.z,
    );

    this.rayResult.reset();

    this.world.raycastClosest(
      from,
      to,
      {
        collisionFilterMask: -1,
        skipBackfaces: true,
      },
      this.rayResult,
    );

    this.isGrounded = this.rayResult.hasHit;
    return this.isGrounded;
  }

  updateTimers(delta) {
    this.checkGrounded();

    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteTime;
    } else {
      this.coyoteTimer -= delta;
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= delta;
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.body.velocity.y = 12;

      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
    }

    if (this.body.velocity.y < 0) {
      this.body.velocity.y +=
        this.world.gravity.y * (this.fallMultiplier - 1) * delta;
    }
  }

  reset() {
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.force.set(0, 0, 0);

    this.body.position.set(0, this.radius + 0.5, 0);

    this.forwardSpeed = 0;

    this.input = { left: false, right: false };

    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.fallMultiplier = 0;

    this.mesh.position.copy(this.body.position);
    this.light.position.copy(this.body.position);
  }

  applyBoost(multiplier, duration) {
    this.boostMultiplier = multiplier;
    this.boostTimer = duration;
    this.mesh.material.emissive.setHex(0xffaa00);
  }

  requestJump() {
    this.jumpBufferTimer = this.jumpBufferTime;
  }

  jump() {
    this.requestJump();
  }

  isFalling() {
    return this.body.position.y < -5;
  }
}

window.Player = Player;
