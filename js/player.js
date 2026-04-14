// js/player.js

class Player {
  constructor(scene, world, playerMaterial, audio) {
    this.scene = scene;
    this.world = world;
    this.playerMaterial = playerMaterial;
    this.audio = audio;

    this.radius = 0.5;

    // ===== MOVIMIENTO =====
    this.forwardSpeed = 0;
    this.maxForwardSpeed = 50;
    this.acceleration = 5;

    this.boostMultiplier = 1.0;
    this.activeSpeedMultiplier = 1.0;
    this.boostTimer = 0;

    // ===== INPUT =====
    this.input = { left: false, right: false };

    // ===== ESTADO =====
    this.isGrounded = false;
    this.coyoteTime = 0.08;
    this.coyoteTimer = 0;
    this.jumpBufferTime = 0.1;
    this.jumpBufferTimer = 0;
    this.fallMultiplier = 1.5;
    this.renderPosition = new THREE.Vector3();
    this.overclockActive = false;
    this._boostActive = false;

    // ===== RAYCAST =====
    this.rayResult = new CANNON.RaycastResult();
    this.groundRayLength = this.radius + 0.15;

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

    this.body.linearDamping = 0.15;
    this.body.angularDamping = 0.5;

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
    const airControlFactor = this.isGrounded ? 1 : 0.6;
    const lateralForce = 18 * airControlFactor;

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

    const maxLateralSpeed = 8;
    if (Math.abs(this.body.velocity.x) > maxLateralSpeed) {
      this.body.velocity.x = Math.sign(this.body.velocity.x) * maxLateralSpeed;
    }
  }

  updateForwardMovement() {
    this.body.velocity.z = this.forwardSpeed * this.activeSpeedMultiplier;
  }

  updateVisuals(delta) {
    const smooth = 1.0 - Math.exp(-12.0 * delta);
    this.mesh.position.lerp(this.body.position, smooth);
    this.mesh.rotation.set(0, 0, 0);

    this.light.position.copy(this.body.position);

    const intensity = 0.8 + (this.forwardSpeed / this.maxForwardSpeed) * 1.2;
    this.light.intensity = Math.min(2.5, intensity);

    const emissiveIntensity =
      0.5 + (this.forwardSpeed / this.maxForwardSpeed) * 1.5;
    this.mesh.material.emissiveIntensity = Math.min(1.5, emissiveIntensity);

    this.renderPosition.copy(this.mesh.position);
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

    const wasGrounded = this.isGrounded;
    this.isGrounded = this.rayResult.hasHit;

    if (!this.isGrounded && wasGrounded) {
      this.coyoteTimer = this.coyoteTime;
    }
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

    if (this.boostTimer > 0) {
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) {
        this.activeSpeedMultiplier = 1.0;
        this._boostActive = false;
        this.mesh.material.emissive.setHex(
          this.overclockActive ? 0xffaa00 : 0x0088aa,
        );
      }
    }
  }

  reset() {
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.force.set(0, 0, 0);

    this.body.position.set(0, this.radius + 0.5, 0);

    this.forwardSpeed = 0;
    this.boostTimer = 0;
    this.boostMultiplier = 1;

    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.fallMultiplier = 1.5;

    this.mesh.position.copy(this.body.position);
    this.light.position.copy(this.body.position);
  }

  applyBoost(multiplier, duration) {
    this.boostTimer = duration;
    this.activeSpeedMultiplier = Math.max(
      this.activeSpeedMultiplier,
      multiplier,
    );
    this._boostActive = true;
    this.mesh.material.emissive.setHex(0x00ffff);
  }

  setOverclockActive(active) {
    this.overclockActive = active;
    if (!this._boostActive) {
      this.mesh.material.emissive.setHex(active ? 0xffaa00 : 0x0088aa);
    }
  }

  requestJump() {
    this.jumpBufferTimer = this.jumpBufferTime;
  }

  jump() {
    if (this.audio) this.audio.play("jump");
    this.requestJump();
  }

  isFalling() {
    return this.body.position.y < -5;
  }
}

window.Player = Player;
