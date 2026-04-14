// js/Environment.js

class Environment {
  constructor(scene, camera, yBase = -16.0) {
    this.scene = scene;
    this.camera = camera;
    this.yBase = yBase;
    this.roadSegments = [];
    this.sideSegments = [];
    this.buildings = [];
    this.segmentCount = 8;
    this.segmentLength = 40;
    this.roadWidth = 60;
    this.sideWidth = 250;
    this.baseSpeed = 15;
    this.currentSpeed = 15;
    this.textureOffset = 0;
    this.visible = true;
    this.lastSideZ = 0;
    this.lastBuildingZ = 0;

    this.createTextures();
    this.initRoad();
    this.initSidesAndBuildings();
  }

  createTextures() {
    const roadCanvas = document.createElement("canvas");
    roadCanvas.width = 512;
    roadCanvas.height = 128;
    const rCtx = roadCanvas.getContext("2d");
    rCtx.fillStyle = "#0a0a1a";
    rCtx.fillRect(0, 0, roadCanvas.width, roadCanvas.height);
    rCtx.shadowBlur = 10;
    rCtx.shadowColor = "#00aaff";
    rCtx.strokeStyle = "#00ffff";
    rCtx.lineWidth = 6;
    rCtx.beginPath();
    rCtx.moveTo(roadCanvas.width / 2, 0);
    rCtx.lineTo(roadCanvas.width / 2, roadCanvas.height);
    rCtx.stroke();
    rCtx.strokeStyle = "#ff44aa";
    rCtx.lineWidth = 4;
    rCtx.beginPath();
    rCtx.moveTo(roadCanvas.width * 0.2, 0);
    rCtx.lineTo(roadCanvas.width * 0.2, roadCanvas.height);
    rCtx.stroke();
    rCtx.beginPath();
    rCtx.moveTo(roadCanvas.width * 0.8, 0);
    rCtx.lineTo(roadCanvas.width * 0.8, roadCanvas.height);
    rCtx.stroke();
    rCtx.shadowBlur = 5;
    rCtx.shadowColor = "#ff00ff";
    rCtx.strokeStyle = "#ff00ff";
    rCtx.lineWidth = 2;
    rCtx.setLineDash([15, 25]);
    rCtx.beginPath();
    rCtx.moveTo(roadCanvas.width / 4, 0);
    rCtx.lineTo(roadCanvas.width / 4, roadCanvas.height);
    rCtx.stroke();
    rCtx.beginPath();
    rCtx.moveTo((3 * roadCanvas.width) / 4, 0);
    rCtx.lineTo((3 * roadCanvas.width) / 4, roadCanvas.height);
    rCtx.stroke();
    this.roadTexture = new THREE.CanvasTexture(roadCanvas);
    this.roadTexture.wrapS = THREE.RepeatWrapping;
    this.roadTexture.wrapT = THREE.RepeatWrapping;
    this.roadTexture.repeat.set(1, 2);

    const gridCanvas = document.createElement("canvas");
    gridCanvas.width = 256;
    gridCanvas.height = 256;
    const gCtx = gridCanvas.getContext("2d");
    gCtx.fillStyle = "#0a0a1a";
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.strokeStyle = "#00ffff";
    gCtx.lineWidth = 2;
    gCtx.shadowBlur = 8;
    gCtx.shadowColor = "#00ffff";
    const cellSize = 80;
    for (let i = 0; i <= 256; i += cellSize) {
      const alpha = 1 - i / 256;
      gCtx.globalAlpha = alpha * 0.8;
      gCtx.beginPath();
      gCtx.moveTo(i, 0);
      gCtx.lineTo(i, 256);
      gCtx.stroke();
      gCtx.beginPath();
      gCtx.moveTo(0, i);
      gCtx.lineTo(256, i);
      gCtx.stroke();
    }
    gCtx.globalAlpha = 1;
    gCtx.strokeStyle = "#ff44aa";
    gCtx.lineWidth = 1;
    gCtx.shadowBlur = 4;
    gCtx.shadowColor = "#ff44aa";
    gCtx.strokeRect(10, 10, 236, 236);
    this.sideTexture = new THREE.CanvasTexture(gridCanvas);
    this.sideTexture.wrapS = THREE.RepeatWrapping;
    this.sideTexture.wrapT = THREE.RepeatWrapping;
    this.sideTexture.repeat.set(1, 2);

    const buildingCanvas = document.createElement("canvas");
    buildingCanvas.width = 64;
    buildingCanvas.height = 128;
    const bCtx = buildingCanvas.getContext("2d");
    bCtx.fillStyle = "#0a0a1a";
    bCtx.fillRect(0, 0, 64, 128);
    bCtx.strokeStyle = "#00ffff";
    bCtx.lineWidth = 2;
    bCtx.shadowBlur = 6;
    bCtx.shadowColor = "#00ffff";
    for (let i = 0; i < 6; i++) {
      bCtx.beginPath();
      bCtx.moveTo(0, i * 20 + 10);
      bCtx.lineTo(64, i * 20 + 10);
      bCtx.stroke();
    }
    bCtx.strokeStyle = "#ff44aa";
    bCtx.shadowColor = "#ff44aa";
    bCtx.strokeRect(4, 4, 56, 120);
    this.buildingTexture = new THREE.CanvasTexture(buildingCanvas);
  }

  initRoad() {
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      color: 0xffffff,
      emissive: 0x112233,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < this.segmentCount; i++) {
      const roadGeo = new THREE.PlaneGeometry(
        this.roadWidth,
        this.segmentLength,
      );
      const roadMesh = new THREE.Mesh(roadGeo, roadMat.clone());
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.y = this.yBase;
      roadMesh.position.z = i * this.segmentLength;
      roadMesh.receiveShadow = true;
      this.scene.add(roadMesh);

      this.roadSegments.push({
        mesh: roadMesh,
        material: roadMesh.material,
        zPos: i * this.segmentLength,
      });
    }
  }

  initSidesAndBuildings() {
    for (let z = -200; z < 400; z += this.segmentLength) {
      this.spawnSideSegment(z);
    }
    this.lastSideZ = 400;

    for (let z = -200; z < 400; z += 25) {
      this.spawnBuilding(z);
    }
    this.lastBuildingZ = 400;
  }

  spawnSideSegment(z) {
    const sideMat = new THREE.MeshStandardMaterial({
      map: this.sideTexture,
      color: 0xffffff,
      emissive: 0x331144,
      emissiveIntensity: 0.6,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const leftGeo = new THREE.PlaneGeometry(this.sideWidth, this.segmentLength);
    const leftMesh = new THREE.Mesh(leftGeo, sideMat.clone());
    leftMesh.rotation.x = -Math.PI / 2;
    leftMesh.position.y = this.yBase;
    leftMesh.position.x = -this.roadWidth / 2 - this.sideWidth / 2;
    leftMesh.position.z = z;
    leftMesh.receiveShadow = true;
    this.scene.add(leftMesh);

    const rightGeo = new THREE.PlaneGeometry(
      this.sideWidth,
      this.segmentLength,
    );
    const rightMesh = new THREE.Mesh(rightGeo, sideMat.clone());
    rightMesh.rotation.x = -Math.PI / 2;
    rightMesh.position.y = this.yBase;
    rightMesh.position.x = this.roadWidth / 2 + this.sideWidth / 2;
    rightMesh.position.z = z;
    rightMesh.receiveShadow = true;
    this.scene.add(rightMesh);

    this.sideSegments.push({ left: leftMesh, right: rightMesh, z });
  }

  spawnBuilding(z) {
    const seed = z * 1000;
    let rand = seed;
    const random = (min, max) => {
      rand = (rand * 9301 + 49297) % 233280;
      return min + (rand / 233280) * (max - min);
    };

    const buildingMat = new THREE.MeshStandardMaterial({
      map: this.buildingTexture,
      color: 0xffffff,
      emissive: 0x113355,
      emissiveIntensity: 0.5,
      roughness: 0.5,
      metalness: 0.1,
    });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff4400,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.95,
    });

    const side = random(0, 1) > 0.5 ? 1 : -1;
    const x = side * (35 + random(0, 50));
    const width = 5 + random(0, 8);
    const depth = 5 + random(0, 8);
    const height = 12 + random(0, 20);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      buildingMat.clone(),
    );
    mesh.position.set(x, this.yBase + height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const windows = [];
    const windowRows = Math.floor(height / 3);
    const windowCols = Math.floor(width / 2.5);
    const windowDepth = 0.3;

    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        if (random(0, 1) > 0.3) {
          const wx = x - width / 2 + 1.2 + col * 2.2;
          const wy = this.yBase + 1.5 + row * 3.2;
          const wz = z + (random(0, 1) - 0.5) * depth * 0.7;
          const windowGeo = new THREE.BoxGeometry(1.2, 1.8, windowDepth);
          const windowMesh = new THREE.Mesh(windowGeo, windowMat.clone());
          windowMesh.position.set(wx, wy, wz);
          windowMesh.castShadow = true;
          this.scene.add(windowMesh);
          windows.push(windowMesh);
        }
      }
    }

    this.buildings.push({ mesh, windows, z });
  }

  setSpeed(speed) {
    this.currentSpeed = speed;
  }

  update(delta, playerZ) {
    if (this.currentSpeed === 0) return;

    const textureSpeedFactor = 0.06;
    this.textureOffset += this.currentSpeed * delta * textureSpeedFactor;

    this.roadSegments.forEach((segment) => {
      segment.zPos -= this.currentSpeed * delta;
      if (segment.zPos + this.segmentLength < playerZ - 50) {
        segment.zPos += this.segmentCount * this.segmentLength;
      }
      segment.mesh.position.z = segment.zPos;
      if (segment.material.map) {
        segment.material.map.offset.y = this.textureOffset % 1;
      }
    });

    while (this.lastSideZ < playerZ + 300) {
      this.spawnSideSegment(this.lastSideZ);
      this.lastSideZ += this.segmentLength;
    }

    this.sideSegments = this.sideSegments.filter((seg) => {
      if (seg.z < playerZ - 150) {
        this.scene.remove(seg.left);
        this.scene.remove(seg.right);
        return false;
      }
      return true;
    });

    while (this.lastBuildingZ < playerZ + 300) {
      this.spawnBuilding(this.lastBuildingZ);
      this.lastBuildingZ += 12 + Math.random() * 15;
    }

    this.buildings = this.buildings.filter((b) => {
      if (b.z < playerZ - 150) {
        this.scene.remove(b.mesh);
        b.windows.forEach((w) => this.scene.remove(w));
        return false;
      }
      return true;
    });
  }

  reset() {
    this.roadSegments.forEach((seg) => this.scene.remove(seg.mesh));
    this.roadSegments = [];

    this.sideSegments.forEach((seg) => {
      this.scene.remove(seg.left);
      this.scene.remove(seg.right);
    });
    this.sideSegments = [];

    this.buildings.forEach((b) => {
      this.scene.remove(b.mesh);
      b.windows.forEach((w) => this.scene.remove(w));
    });
    this.buildings = [];

    this.textureOffset = 0;
    this.currentSpeed = this.baseSpeed;
    this.lastSideZ = 0;
    this.lastBuildingZ = 0;

    this.initRoad();
    this.initSidesAndBuildings();
  }

  setVisible(visible) {
    this.visible = visible;
    this.roadSegments.forEach((seg) => (seg.mesh.visible = visible));
    this.sideSegments.forEach((seg) => {
      seg.left.visible = visible;
      seg.right.visible = visible;
    });
    this.buildings.forEach((b) => {
      b.mesh.visible = visible;
      b.windows.forEach((w) => (w.visible = visible));
    });
  }
}

window.Environment = Environment;
