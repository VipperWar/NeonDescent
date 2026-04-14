// js/game.js

class Game {
  constructor(scene, camera, audio) {
    this.scene = scene;
    this.camera = camera;
    this._lastTime = performance.now();
    this._active = false;
    this.audio = audio;

    // ====== ESTADÍSTICAS ======
    this.bits = [];
    this.bitsCount = 0;
    this.integrity = 100;
    this.distance = 0;

    // ====== OVERCLOCK ======
    this.overclockActive = false;
    this.overclockTimer = 0;
    this.overclockDuration = 8;
    this.savedForwardSpeed = 0;

    // ====== PUNTUACIÓN ======
    this.platformsPassed = 0;
    this.score = 0;

    // ====== CARRILES ======
    this.lanes = [-6, -3, 0, 3, 6];
    this.laneWidth = 3.0;
    this.currentZ = 0;
    this.chunkLength = 30;
    this.previousActiveLanes = null;

    // ====== BITS ======
    this.maxBitsPerChunk = 3;
    this.bitBaseChance = 0.12;
    this.bitFlowDirection = "center";
    this.previousBitLane = 2;

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

    // ====== EFECTOS ======

    this.glitchPass = null;
    this.composer = null;

    // ====== DATA ======
    this.platforms = [];
    this.obstacles = [];

    // ====== PLAYER ======
    this.player = new Player(
      this.scene,
      this.world,
      this.playerMaterial,
      this.audio,
    );

    // ====== PAUSE ======

    this.isPaused = false;
    this.pauseOverlay = null;
    this.createPauseMenu();

    // ====== INPUT ======
    this.input = { left: false, right: false };
    this.setupInput();

    // ====== TRAIL ======
    this.createTrailEffect();

    // ====== PRECARGA SILENCIOSA ======
    this.environment = new Environment(this.scene, this.camera, -16.0);
    this.environment.setVisible(false);

    this._preloadChunks(5);
  }

  // ------------------------------------------------------------------
  // ACTIVACIÓN DEL JUEGO
  // ------------------------------------------------------------------
  activate() {
    this.environment.setVisible(true);
    this.platforms.forEach((p) => (p.mesh.visible = true));
    this.obstacles.forEach((o) => (o.mesh.visible = true));
    this.bits.forEach((b) => (b.mesh.visible = true));
    this.player.mesh.visible = true;
    if (this.trail) this.trail.visible = true;
    if (Howler.ctx && Howler.ctx.state === "suspended") {
      Howler.ctx.resume();
    }
    this.audio.playMusic();
    this._active = true;
    this._lastTime = performance.now();
  }

  _preloadChunks(count) {
    for (let i = 0; i < count; i++) {
      this.generateChunk(true);
    }
    this.platforms.forEach((p) => (p.mesh.visible = false));
    this.obstacles.forEach((o) => (o.mesh.visible = false));
    this.bits.forEach((b) => (b.mesh.visible = false));
    this.player.mesh.visible = false;
    if (this.trail) this.trail.visible = false;
  }

  setupInput() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._active) {
        this.togglePause();
        e.preventDefault();
        return;
      }

      if (this.isPaused) return;

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

  createPauseMenu() {
    const overlay = document.createElement("div");
    overlay.className = "pause-overlay hidden";
    overlay.innerHTML = `
      <div class="pause-panel">
        <div class="pause-title">PAUSED</div>
        
        <div class="volume-control">
          <div class="volume-label">
            <span>MUSIC</span>
            <span class="volume-value" id="pause-music-value">30%</span>
          </div>
          <input type="range" id="pause-music-volume" class="volume-slider" min="0" max="1" step="0.01" value="0.3">
        </div>
        
        <div class="volume-control">
          <div class="volume-label">
            <span>SFX</span>
            <span class="volume-value" id="pause-sfx-value">50%</span>
          </div>
          <input type="range" id="pause-sfx-volume" class="volume-slider" min="0" max="1" step="0.01" value="0.5">
        </div>
        
        <div class="pause-buttons">
          <button class="pause-btn" id="resume-btn">▶ RESUME</button>
          <button class="pause-btn menu-btn" id="menu-btn">MAIN MENU</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.pauseOverlay = overlay;

    const resumeBtn = overlay.querySelector("#resume-btn");
    resumeBtn.addEventListener("click", () => this.togglePause());

    const menuBtn = overlay.querySelector("#menu-btn");
    menuBtn.addEventListener("click", () => this.returnToMainMenu());

    const musicSlider = overlay.querySelector("#pause-music-volume");
    const sfxSlider = overlay.querySelector("#pause-sfx-volume");
    const musicValue = overlay.querySelector("#pause-music-value");
    const sfxValue = overlay.querySelector("#pause-sfx-value");

    musicSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      musicValue.textContent = Math.round(val * 100) + "%";
      if (this.audio) this.audio.setMusicVolume(val);
    });

    sfxSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      sfxValue.textContent = Math.round(val * 100) + "%";
      if (this.audio) this.audio.setSFXVolume(val);
    });
  }

  togglePause() {
    if (!this._active) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      if (this.audio && this.audio.music) {
        this.audio.music.pause();
      }
      const musicSlider = this.pauseOverlay.querySelector(
        "#pause-music-volume",
      );
      const sfxSlider = this.pauseOverlay.querySelector("#pause-sfx-volume");
      const musicValue = this.pauseOverlay.querySelector("#pause-music-value");
      const sfxValue = this.pauseOverlay.querySelector("#pause-sfx-value");

      musicSlider.value = this.audio.getMusicVolume();
      sfxSlider.value = this.audio.getSFXVolume();
      musicValue.textContent =
        Math.round(this.audio.getMusicVolume() * 100) + "%";
      sfxValue.textContent = Math.round(this.audio.getSFXVolume() * 100) + "%";

      this.pauseOverlay.classList.remove("hidden");
    } else {
      if (this.audio && this.audio.music && this.audio.getMusicVolume() > 0) {
        this.audio.music.play();
      }
      this.pauseOverlay.classList.add("hidden");
    }
  }

  returnToMainMenu() {
    this._active = false;
    this.isPaused = false;
    this.pauseOverlay.classList.add("hidden");

    if (this.audio) {
      this.audio.stopMusic();
    }

    const hud = document.getElementById("hud");
    if (hud) hud.classList.add("hidden");
    const gameoverScreen = document.getElementById("gameover-screen");
    if (gameoverScreen) gameoverScreen.classList.add("hidden");

    window.init();
  }

  cleanup() {
    this.platforms.forEach((p) => {
      this.world.removeBody(p.body);
      this.scene.remove(p.mesh);
    });
    this.platforms = [];

    this.obstacles.forEach((o) => this.scene.remove(o.mesh));
    this.obstacles = [];

    this.bits.forEach((b) => this.scene.remove(b.mesh));
    this.bits = [];

    if (this.player) {
      this.world.removeBody(this.player.body);
      this.scene.remove(this.player.mesh);
      this.scene.remove(this.player.light);
    }

    if (this.trail) this.scene.remove(this.trail);

    if (this.environment) {
      this.environment.roadSegments?.forEach((s) => this.scene.remove(s.mesh));
      this.environment.sideSegments?.forEach((s) => {
        this.scene.remove(s.left);
        this.scene.remove(s.right);
      });
      this.environment.buildings?.forEach((b) => {
        this.scene.remove(b.mesh);
        b.windows?.forEach((w) => this.scene.remove(w));
      });
      if (this.environment.horizonSprite) {
        this.camera.remove(this.environment.horizonSprite);
      }
    }

    const lightsToRemove = [];
    this.scene.children.forEach((child) => {
      if (child instanceof THREE.Light) {
        lightsToRemove.push(child);
      }
    });
    lightsToRemove.forEach((light) => this.scene.remove(light));

    this.world.bodies.forEach((body) => this.world.removeBody(body));
    this.world.contacts.length = 0;
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
          this.player.applyBoost(1.5, 0.5);
        }
      }
    }
  }

  initTrack() {
    for (let i = 0; i < 2; i++) {
      this.generateChunk();
    }
  }

  spawnPlatform(x, zMin, length, width = this.laneWidth, isBoost) {
    const z = zMin + length / 2;
    const height = 0.5;
    const color = isBoost ? 0x00aa33 : 0x0a0a1a;
    const emissive = isBoost ? 0x004466 : 0x001133;
    const emissiveIntensity = isBoost ? 0.8 : 0.8;

    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: emissive,
      emissiveIntensity: emissiveIntensity,
      metalness: 0.8,
      roughness: 0.4,
      transparent: true,
      opacity: 0.9,
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

  spawnObstacle({ x, z, width, height, type }) {
    let depth = 1.0;
    if (type === "full") depth = 1.5;

    const y = height / 2 + 0.5;

    const geometry = new THREE.BoxGeometry(width, height, depth);

    let color = 0xff3333;
    let emissive = 0x440000;

    const material = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 1.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.scene.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);

    this.obstacles.push({
      mesh,
      box,
      type,
    });
  }

  spawnObstaclesForChunk(platforms, startZ, endZ) {
    if (!platforms || platforms.length === 0) return;

    const r = Math.random();

    if (r < 0.6) {
      this.spawnBlock(platforms, startZ, endZ);
    } else if (r < 0.8) {
      this.spawnWide(platforms, startZ, endZ);
    } else {
      this.spawnFull(platforms, startZ, endZ);
    }
  }

  spawnBlock(platforms, startZ, endZ) {
    const p = this.getRandom(platforms);

    const z = startZ + 5 + Math.random() * (endZ - startZ - 10);

    this.spawnObstacle({
      x: p.x,
      z,
      height: 1,
      type: "block",
    });
  }

  spawnWide(platforms, startZ, endZ) {
    const sorted = [...platforms].sort((a, b) => a.lane - b.lane);

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];

      if (b.lane === a.lane + 1) {
        const z = startZ + 5 + Math.random() * (endZ - startZ - 10);
        const midX = (a.x + b.x) / 2;

        this.spawnObstacle({
          x: midX,
          z,
          width: this.laneWidth * 2,
          height: 1,
          type: "wide",
        });

        return;
      }
    }

    this.spawnBlock(platforms, startZ, endZ);
  }

  spawnFull(platforms, startZ, endZ) {
    if (platforms.length < 2) {
      this.spawnBlock(platforms, startZ, endZ);
      return;
    }

    const sorted = [...platforms].sort((a, b) => a.lane - b.lane);

    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const z = startZ + 5 + Math.random() * (endZ - startZ - 10);
    const midX = (min.x + max.x) / 2;
    const width = (max.lane - min.lane + 1) * this.laneWidth;

    this.spawnObstacle({
      x: midX,
      z,
      width,
      height: 2,
      type: "full",
    });
  }

  spawnBit(x, zMin, zMax) {
    const geometry = new THREE.OctahedronGeometry(0.4);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0x442200,
      emissiveIntensity: 2.0,
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

  spawnBitCluster(x, startZ, endZ, type = "line") {
    const count = 2 + Math.floor(Math.random() * 4);

    const zStart = startZ + 4;
    const zStep = (endZ - startZ - 8) / count;

    for (let i = 0; i < count; i++) {
      let offsetX = 0;

      this.spawnBit(x + offsetX, zStart + i * zStep, zStart + i * zStep + 0.01);
    }

    return count;
  }

  activateOverclock() {
    if (this.overclockActive) return;

    this.audio.play("overclock");
    this.savedForwardSpeed = this.player.forwardSpeed;
    this.player.forwardSpeed *= 1.3;
    this.player.body.velocity.z = this.player.forwardSpeed;

    this.overclockActive = true;
    this.overclockTimer = this.overclockDuration;

    if (this.composer) {
      const bloomPass = this.composer.passes.find(
        (p) => p instanceof THREE.UnrealBloomPass,
      );
      if (bloomPass) {
        this._normalBloomStrength = bloomPass.strength;
        bloomPass.strength = 0.5;
      }
    }

    this.player.mesh.material.emissive.setHex(0xffaa00);
  }

  deactivateOverclock() {
    this.overclockActive = false;

    this.player.forwardSpeed = this.savedForwardSpeed;
    this.player.body.velocity.z = this.player.forwardSpeed;

    if (this.composer) {
      const bloomPass = this.composer.passes.find(
        (p) => p instanceof THREE.UnrealBloomPass,
      );
      if (bloomPass) {
        bloomPass.strength = this._normalBloomStrength || 0.4;
      }
    }

    this.player.mesh.material.emissive.setHex(0x0088aa);
  }

  checkObstacleCollisions() {
    const playerBox = new THREE.Box3().setFromObject(this.player.mesh);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      obs.box.setFromObject(obs.mesh);

      if (playerBox.intersectsBox(obs.box)) {
        if (!this.overclockActive) {
          this.integrity = Math.max(0, this.integrity - 25);
          this.audio.play("damage");
          this.triggerGlitch(0.2);
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

      const dx = pos.x - bit.position.x;
      const dy = pos.y - bit.position.y;
      const dz = pos.z - bit.position.z;

      if (dx * dx + dy * dy + dz * dz < (r + bit.radius) ** 2) {
        if (!this.overclockActive) {
          this.bitsCount = Math.min(10, this.bitsCount + 1);
          this.audio.play("bit");
        }

        this.scene.remove(bit.mesh);
        this.bits.splice(i, 1);

        this.player.mesh.material.emissiveIntensity = 2.0;

        setTimeout(() => {
          if (this.player?.mesh?.material)
            this.player.mesh.material.emissiveIntensity = 1.0;
        }, 100);

        if (this.bitsCount >= 10 && !this.overclockActive) {
          this.bitsCount = 0;
          this.activateOverclock();
        }
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

    const candidates = available
      .map((name) => this.patterns.find((p) => p.name === name))
      .filter(Boolean);

    const prev = this.previousActiveLanes;

    if (!this.recentPatterns) this.recentPatterns = [];
    const recentNames = this.recentPatterns;

    if (!this.chunkCounter) this.chunkCounter = 0;
    this.chunkCounter++;
    const forceDiversity = this.chunkCounter % 6 === 0;

    if (!prev) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.recentPatterns.push(pick.name);
      if (this.recentPatterns.length > 3) this.recentPatterns.shift();
      return pick;
    }

    const scored = candidates.map((p) => {
      const lanes = this.resolvePatternLanes(p);

      let score = lanes.filter((l) => prev.includes(l)).length;

      if (score === 0 && !forceDiversity) score = -1;

      if (recentNames.includes(p.name)) score *= 0.3;

      if (forceDiversity) {
        if (score <= 0) return { pattern: p, score: -1 };
        score = 1 / (score + 1);
      }

      return { pattern: p, score };
    });

    const valid = scored.filter((item) => item.score > -1);

    let best;
    if (valid.length === 0) {
      best = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      valid.sort((a, b) => b.score - a.score);
      const top = valid.slice(0, Math.min(2, valid.length));
      best = top[Math.floor(Math.random() * top.length)].pattern;
    }

    this.recentPatterns.push(best.name);
    if (this.recentPatterns.length > 3) this.recentPatterns.shift();

    return best;
  }

  generateChunk(silent) {
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

    const platformsForChunk = [];

    for (let idx of active) {
      platformsForChunk.push({
        lane: idx,
        x: this.lanes[idx],
      });
    }

    const obsProb = Math.min(0.8, 0.3 + (this.distance / 1000) * 0.5);

    if (Math.random() < obsProb) {
      this.spawnObstaclesForChunk(platformsForChunk, startZ, endZ);
    }

    let bitsSpawned = 0;
    const flow = this.getBitFlowDirection(active);
    this.bitFlowDirection = flow;
    let orderedLanes = this.applyFlowBias([...active], flow);

    const useDoubleRoute = active.length >= 3 && Math.random() < 0.75;

    if (useDoubleRoute) {
      const primaryLane = orderedLanes[0];
      let secondaryLane;
      for (let lane of orderedLanes) {
        if (lane !== primaryLane) {
          secondaryLane = lane;
          break;
        }
      }
      if (secondaryLane !== undefined) {
        if (Math.random() < 0.6 && bitsSpawned < this.maxBitsPerChunk) {
          const x1 = this.lanes[primaryLane];
          const count1 = this.spawnBitCluster(x1, startZ, endZ, "line");
          bitsSpawned += count1;
        }
        if (bitsSpawned < this.maxBitsPerChunk && Math.random() < 0.5) {
          const x2 = this.lanes[secondaryLane];
          const count2 = 2 + Math.floor(Math.random() * 2);
          const zStart2 = startZ + 4;
          const zStep2 = (endZ - startZ - 8) / count2;
          for (let i = 0; i < count2; i++) {
            this.spawnBit(
              x2,
              zStart2 + i * zStep2,
              zStart2 + i * zStep2 + 0.01,
            );
            bitsSpawned++;
          }
        }
      }
    } else {
      if (Math.random() < 0.6 && bitsSpawned < this.maxBitsPerChunk) {
        const mainLane = orderedLanes[0];
        const x = this.lanes[mainLane];
        const count = this.spawnBitCluster(x, startZ, endZ, "line");
        bitsSpawned += count;
      }
    }

    this.previousBitLane = orderedLanes[0];
    this.previousActiveLanes = active;
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
      if (obs.mesh.position.z < playerZ - 40) {
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
    if (!this._active || this.isPaused) return;

    if (delta > 0.033) delta = 0.033;

    if (this.overclockActive) {
      this.overclockTimer -= delta;
      if (this.overclockTimer <= 0) this.deactivateOverclock();
    } else {
      const targetSpeed = this.player.maxForwardSpeed;

      this.player.forwardSpeed = Math.min(
        targetSpeed,
        this.player.forwardSpeed + this.player.acceleration * delta,
      );
    }

    this.player.updateInput(this.input);
    this.player.updateForwardMovement();

    if (this.environment) {
      const envSpeed = 15 + this.distance * 0.3;
      this.environment.setSpeed(envSpeed);
      this.environment.update(delta, this.player.body.position.z);
    }

    this.player.updateTimers(delta);
    this.player.prevPosition.copy(this.player.body.position);
    this.world.step(1 / 60, delta, 10);

    this.updatePlatformTouched();
    this.checkObstacleCollisions();
    this.checkBitCollection();
    this.checkPlatformPassed();

    if (this.player.isFalling()) {
      this.gameOver();
      return;
    }

    this.player.updateVisuals();
    this.updateTrail();
    this.updateCamera(delta);
    this.updateTrack();
    this.updateHUD();
  }

  updateCamera(delta) {
    const p = this.player.renderPosition || this.player.body.position;
    const targetPos = new THREE.Vector3(p.x * 0.4, p.y + 3, p.z - 7);

    if (!this._cameraReady) {
      this.camera.position.copy(targetPos);
      this._cameraReady = true;
    } else {
      const smooth = 1 - Math.pow(0.001, delta);
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
    this._active = false;
    this.audio.play("gameover");

    const finalDistance = document.getElementById("final-distance");
    const finalSpeed = document.getElementById("final-speed");
    const finalScore = document.getElementById("final-score");

    if (finalDistance) finalDistance.textContent = this.distance;
    if (finalSpeed)
      finalSpeed.textContent = Math.floor(this.player.forwardSpeed * 10);
    if (finalScore) finalScore.textContent = this.score;

    const gameoverScreen = document.getElementById("gameover-screen");
    if (gameoverScreen) gameoverScreen.classList.remove("hidden");

    this.audio.stopMusic();
    const restartBtn = document.getElementById("btn-restart");
    if (restartBtn) {
      restartBtn.onclick = () => setTimeout(() => this.resetGame(), 150);
    }
  }

  getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  resolvePatternLanes(pattern) {
    const lanes =
      typeof pattern.lanes === "function" ? pattern.lanes() : pattern.lanes;

    return lanes;
  }

  getBitFlowDirection(activeLanes) {
    const r = Math.random();
    if (this.bitFlowDirection && Math.random() < 0.8) {
      return this.bitFlowDirection;
    }

    const roll = Math.random();

    if (roll < 0.4) return "center";
    if (roll < 0.6) return "leftBias";
    if (roll < 0.8) return "rightBias";
    if (roll < 0.9) return "zigzag";
    return "split";
  }

  applyFlowBias(lanes, direction) {
    switch (direction) {
      case "center":
        return lanes.sort((a, b) => Math.abs(a - 2) - Math.abs(b - 2));

      case "leftBias":
        return lanes.sort((a, b) => a - b);

      case "rightBias":
        return lanes.sort((a, b) => b - a);

      case "zigzag":
        return lanes;

      case "split":
        return lanes;

      default:
        return lanes;
    }
  }

  setPostProcessing(composer, glitchPass) {
    this.composer = composer;
    this.glitchPass = glitchPass;
  }

  triggerGlitch(duration = 0.2) {
    if (!this.glitchPass) return;
    this.glitchPass.enabled = true;
    this.glitchPass.goWild = true;

    clearTimeout(this._glitchTimeout);
    this._glitchTimeout = setTimeout(() => {
      if (this.glitchPass) {
        this.glitchPass.enabled = false;
        this.glitchPass.goWild = false;
      }
    }, duration * 1000);
  }

  resetGame() {
    this._active = false;

    this.integrity = 100;
    this.distance = 0;
    this.platformsPassed = 0;
    this.score = 0;
    this.overclockActive = false;
    this.overclockTimer = 0;
    this.bitsCount = 0;
    this.previousActiveLanes = null;
    this.bitFlowDirection = "center";
    this.chunkCounter = 0;
    this.recentPatterns = [];

    this.platforms.forEach((p) => {
      this.world.removeBody(p.body);
      this.scene.remove(p.mesh);
    });
    this.platforms = [];

    this.obstacles.forEach((o) => this.scene.remove(o.mesh));
    this.obstacles = [];

    this.bits.forEach((b) => this.scene.remove(b.mesh));
    this.bits = [];

    this.trailPositions = [];

    this.player.reset();
    this.player.mesh.material.emissive.setHex(0x0088aa);

    this.camera.position.set(0, 6, -7);
    this.camera.lookAt(0, 1, 10);
    this._cameraReady = false;

    if (this.environment) {
      this.environment.reset();
      this.environment.setVisible(true);
    } else {
      this.environment = new Environment(this.scene, -16.0);
    }

    this.currentZ = 0;
    this.initTrack();

    this._active = true;
    this._lastTime = performance.now();
    this.audio.playMusic();

    const gameoverScreen = document.getElementById("gameover-screen");
    if (gameoverScreen) gameoverScreen.classList.add("hidden");
  }
}

window.Game = Game;
