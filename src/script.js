// Pencil 3D: High-Performance WebGL 3D Pencil & Native Canvas Sketchpad
// Built with Three.js (WebGL) + HTML5 Canvas 2D
// Fully responsive, subpixel-accurate unprojection, zero-lag trackpad support

(function(window) {
  'use strict';

  // --- Helpers ---
  function toRad(deg) {
    return (Math.PI / 180) * deg;
  }

  // --- Global Application State ---
  var wW = window.innerWidth;
  var wH = window.innerHeight;

  var pencilCanvas, sketchCanvas, sketchCtx;
  var scene, camera, renderer;
  var pencilRoot, pencilModel, tipMesh, shadowMesh;
  var targetElevation = 1.8; // z elevation: 0 when drawing, 1.8 when hovering

  var isDrawing = false;
  var isSpaceDown = false;
  var isMouseDown = false;
  var isInteractingWithUI = false;
  var currentPressure = 1.0;

  var currentColor = '#2d3139';
  var currentStrokeSize = 5;

  var lastMouseX = wW / 2;
  var lastMouseY = wH / 2;
  var lastDrawX = 0;
  var lastDrawY = 0;

  var strokes = []; // Undo history: array of { color, size, points }
  var currentStroke = null;

  /* -------------------------------------------------------------
     1. Shadow Texture Generator (Soft Radial Gradient)
  ------------------------------------------------------------- */
  function createShadowTexture() {
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    var ctx = c.getContext('2d');

    // Create tapered soft shadow
    var grad = ctx.createRadialGradient(128, 90, 4, 128, 220, 160);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(128, 200, 70, 190, 0, 0, Math.PI * 2);
    ctx.fill();

    var tex = new THREE.Texture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /* -------------------------------------------------------------
     2. Three.js Procedural 3D Pencil & Shadow Creation
  ------------------------------------------------------------- */
  function buildPencilScene() {
    pencilCanvas = document.getElementById('pencil3D');
    pencilCanvas.width = wW;
    pencilCanvas.height = wH;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, wW / wH, 0.1, 1000);
    camera.position.set(0, 0, 30);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    renderer = new THREE.WebGLRenderer({
      canvas: pencilCanvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(wW, wH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Three-point Lighting
    var ambLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambLight);

    var keyLight = new THREE.DirectionalLight(0xfffaec, 0.95);
    keyLight.position.set(-15, 20, 25);
    scene.add(keyLight);

    var fillLight = new THREE.DirectionalLight(0xddeeff, 0.45);
    fillLight.position.set(15, -10, 15);
    scene.add(fillLight);

    // Root Group for Position & Rotation in Scene
    pencilRoot = new THREE.Group();
    scene.add(pencilRoot);

    // Inner Model Group (contains all pencil geometry, tilted naturally)
    pencilModel = new THREE.Group();

    // 1. Graphite Tip (sharp point at y = 0, base at y = 0.45)
    var tipGeo = new THREE.CylinderGeometry(0.12, 0.001, 0.45, 16);
    tipGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.225, 0));
    var tipMat = new THREE.MeshPhongMaterial({
      color: 0x242424,
      shininess: 40,
      specular: 0x444444
    });
    tipMesh = new THREE.Mesh(tipGeo, tipMat);
    pencilModel.add(tipMesh);

    // 2. Carved Wood Collar (from y = 0.45 to y = 1.75)
    var woodGeo = new THREE.CylinderGeometry(0.38, 0.12, 1.3, 16);
    woodGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.45 + 0.65, 0));
    var woodMat = new THREE.MeshPhongMaterial({
      color: 0xdfbe93,
      shininess: 8,
      specular: 0x111111
    });
    pencilModel.add(new THREE.Mesh(woodGeo, woodMat));

    // 3. Hexagonal Yellow Pencil Body (from y = 1.75 to y = 12.75)
    var bodyHeight = 11.0;
    var bodyGeo = new THREE.CylinderGeometry(0.38, 0.38, bodyHeight, 6);
    bodyGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 1.75 + bodyHeight / 2, 0));
    var bodyMat = new THREE.MeshPhongMaterial({
      color: 0xf5a623,
      shininess: 70,
      specular: 0x555555
    });
    pencilModel.add(new THREE.Mesh(bodyGeo, bodyMat));

    // 4. Accent Ring
    var ringGeo = new THREE.CylinderGeometry(0.382, 0.382, 0.25, 6);
    ringGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 1.75 + bodyHeight - 0.2, 0));
    var ringMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 30 });
    pencilModel.add(new THREE.Mesh(ringGeo, ringMat));

    // 5. Metallic Brass Ferrule (from y = 12.75 to y = 14.05)
    var ferruleHeight = 1.3;
    var ferruleGeo = new THREE.CylinderGeometry(0.395, 0.395, ferruleHeight, 24);
    ferruleGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 12.75 + ferruleHeight / 2, 0));
    var ferruleMat = new THREE.MeshPhongMaterial({
      color: 0xd4af37,
      shininess: 100,
      specular: 0xffffff
    });
    pencilModel.add(new THREE.Mesh(ferruleGeo, ferruleMat));

    // Crimped rings on ferrule
    var crimp1Geo = new THREE.CylinderGeometry(0.41, 0.41, 0.1, 24);
    crimp1Geo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 13.1, 0));
    var crimpMat = new THREE.MeshPhongMaterial({ color: 0xb89025, shininess: 80 });
    pencilModel.add(new THREE.Mesh(crimp1Geo, crimpMat));

    var crimp2Geo = new THREE.CylinderGeometry(0.41, 0.41, 0.1, 24);
    crimp2Geo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 13.6, 0));
    pencilModel.add(new THREE.Mesh(crimp2Geo, crimpMat));

    // 6. Pink Rubber Eraser (from y = 14.05 to y = 15.25)
    var eraserHeight = 1.2;
    var eraserGeo = new THREE.CylinderGeometry(0.375, 0.375, eraserHeight, 24);
    eraserGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 14.05 + eraserHeight / 2, 0));
    var eraserMat = new THREE.MeshPhongMaterial({
      color: 0xe06b75,
      shininess: 12,
      specular: 0x222222
    });
    pencilModel.add(new THREE.Mesh(eraserGeo, eraserMat));

    // Rounded Eraser Cap
    var capGeo = new THREE.SphereGeometry(0.375, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    capGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 14.05 + eraserHeight, 0));
    pencilModel.add(new THREE.Mesh(capGeo, eraserMat));

    // Natural hand drawing tilt: leaning toward viewer and to the right
    pencilModel.rotation.x = toRad(52);
    pencilModel.rotation.z = toRad(-32);
    pencilModel.rotation.y = toRad(12);

    var scale = 1.35;
    pencilModel.scale.set(scale, scale, scale);

    pencilRoot.add(pencilModel);

    // Realistic Soft Dynamic Shadow Plane (lies on paper plane z = 0.01)
    var shadowGeo = new THREE.PlaneGeometry(3.5, 7.0);
    shadowGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0.6, 2.5, 0));
    var shadowMat = new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      opacity: 0.15,
      depthWrite: false
    });
    shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.z = 0.01;
    shadowMesh.rotation.z = toRad(-32);
    scene.add(shadowMesh);

    pencilRoot.position.z = targetElevation;
  }

  function setPencilTipColor(colorHex) {
    if (tipMesh && tipMesh.material) {
      tipMesh.material.color.setStyle(colorHex);
    }
  }

  /* -------------------------------------------------------------
     3. Subpixel-Accurate Coordinate Unprojection
  ------------------------------------------------------------- */
  function updatePencilTransform(screenX, screenY) {
    if (!pencilRoot || !camera) return;

    var ndcX = (screenX / wW) * 2 - 1;
    var ndcY = -(screenY / wH) * 2 + 1;

    // Unproject NDC ray through camera into 3D world space
    var rayVector = new THREE.Vector3(ndcX, ndcY, 0.5);
    rayVector.unproject(camera);
    var dir = rayVector.sub(camera.position).normalize();

    // Distance to paper plane z = 0
    var t = -camera.position.z / dir.z;
    var worldX = camera.position.x + dir.x * t;
    var worldY = camera.position.y + dir.y * t;

    // Position pencil tip directly at cursor
    pencilRoot.position.x = worldX;
    pencilRoot.position.y = worldY;

    // Dynamic hand rotation
    var rangeX = (screenX / wW) - 0.5;
    var rangeY = (screenY / wH) - 0.5;
    pencilRoot.rotation.y = rangeX * 0.42;
    pencilRoot.rotation.x = -rangeY * 0.32;
    pencilRoot.rotation.z = rangeX * 0.22;

    // Shadow follows ground projection
    if (shadowMesh) {
      shadowMesh.position.x = worldX;
      shadowMesh.position.y = worldY;
      var curZ = pencilRoot.position.z;
      var sAlpha = Math.max(0.12, 0.42 - curZ * 0.12);
      shadowMesh.material.opacity = sAlpha;
      var sScale = 0.95 + curZ * 0.15;
      shadowMesh.scale.set(sScale, sScale, sScale);
    }
  }

  /* -------------------------------------------------------------
     4. Native HTML5 Canvas 2D Sketching Engine
  ------------------------------------------------------------- */
  function initSketchCanvas() {
    sketchCanvas = document.getElementById('sketch');
    sketchCanvas.width = wW;
    sketchCanvas.height = wH;
    sketchCtx = sketchCanvas.getContext('2d');
  }

  function getSketchBounds() {
    var sketchpad = document.getElementById('sketchpad');
    if (!sketchpad) return { x: 0, y: 0, width: wW, height: wH };
    var rect = sketchpad.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function isInsideBounds(x, y) {
    var b = getSketchBounds();
    return (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height);
  }

  function startSketchStroke(x, y) {
    if (!isInsideBounds(x, y)) return false;

    isDrawing = true;
    targetElevation = 0.0; // Lower pencil to paper

    lastDrawX = x;
    lastDrawY = y;

    currentStroke = {
      color: currentColor,
      size: currentStrokeSize,
      pressure: currentPressure,
      points: [{ x: x, y: y, pressure: currentPressure }]
    };

    // Draw single dot for initial tap
    sketchCtx.save();
    sketchCtx.fillStyle = currentColor;
    sketchCtx.beginPath();
    var dotRadius = (currentStrokeSize * currentPressure) / 2;
    sketchCtx.arc(x, y, dotRadius, 0, Math.PI * 2);
    sketchCtx.fill();
    sketchCtx.restore();

    updateTrackpadBadge(true);
    return true;
  }

  function continueSketchStroke(x, y) {
    if (!isDrawing || !currentStroke) return;

    // Check bounds
    if (!isInsideBounds(x, y)) {
      endSketchStroke();
      return;
    }

    var dist = Math.hypot(x - lastDrawX, y - lastDrawY);
    if (dist < 1.5) return; // Ignore micro jitter

    var midX = (lastDrawX + x) / 2;
    var midY = (lastDrawY + y) / 2;

    sketchCtx.save();
    sketchCtx.strokeStyle = currentColor;
    sketchCtx.lineWidth = Math.max(1, currentStrokeSize * currentPressure);
    sketchCtx.lineCap = 'round';
    sketchCtx.lineJoin = 'round';

    sketchCtx.beginPath();
    sketchCtx.moveTo(lastDrawX, lastDrawY);
    sketchCtx.quadraticCurveTo(lastDrawX, lastDrawY, midX, midY);
    sketchCtx.stroke();
    sketchCtx.restore();

    currentStroke.points.push({ x: x, y: y, pressure: currentPressure });
    lastDrawX = x;
    lastDrawY = y;
  }

  function endSketchStroke() {
    if (!isDrawing) return;
    isDrawing = false;
    targetElevation = 1.8; // Lift pencil off paper

    if (currentStroke && currentStroke.points.length > 0) {
      strokes.push(currentStroke);
    }
    currentStroke = null;
    updateTrackpadBadge(false);
  }

  function redrawAllStrokes() {
    sketchCtx.clearRect(0, 0, wW, wH);
    for (var i = 0; i < strokes.length; i++) {
      var s = strokes[i];
      var pts = s.points;
      if (!pts || pts.length === 0) continue;

      sketchCtx.save();
      sketchCtx.strokeStyle = s.color;
      sketchCtx.fillStyle = s.color;
      sketchCtx.lineCap = 'round';
      sketchCtx.lineJoin = 'round';

      if (pts.length === 1) {
        sketchCtx.beginPath();
        var rad = (s.size * (pts[0].pressure || 1)) / 2;
        sketchCtx.arc(pts[0].x, pts[0].y, rad, 0, Math.PI * 2);
        sketchCtx.fill();
      } else {
        for (var j = 1; j < pts.length; j++) {
          var p0 = pts[j - 1];
          var p1 = pts[j];
          var mx = (p0.x + p1.x) / 2;
          var my = (p0.y + p1.y) / 2;
          sketchCtx.lineWidth = Math.max(1, s.size * (p1.pressure || 1));
          sketchCtx.beginPath();
          sketchCtx.moveTo(p0.x, p0.y);
          sketchCtx.quadraticCurveTo(p0.x, p0.y, mx, my);
          sketchCtx.stroke();
        }
      }
      sketchCtx.restore();
    }
  }

  function undoLastStroke() {
    if (strokes.length > 0) {
      strokes.pop();
      redrawAllStrokes();
    }
  }

  function clearAllStrokes() {
    strokes = [];
    currentStroke = null;
    sketchCtx.clearRect(0, 0, wW, wH);
  }

  function exportSketchPNG() {
    var bounds = getSketchBounds();
    var exportCanvas = document.createElement('canvas');
    exportCanvas.width = bounds.width;
    exportCanvas.height = bounds.height;
    var ctx = exportCanvas.getContext('2d');

    // Fill realistic sketchpad paper background
    ctx.fillStyle = '#fbfaf7';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw grid dots
    ctx.fillStyle = '#e8e4d9';
    for (var x = 15; x < exportCanvas.width; x += 30) {
      for (var y = 15; y < exportCanvas.height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Crop drawing from main sketch canvas
    ctx.drawImage(
      sketchCanvas,
      bounds.x, bounds.y, bounds.width, bounds.height,
      0, 0, bounds.width, bounds.height
    );

    // Watermark
    ctx.fillStyle = 'rgba(120, 115, 105, 0.45)';
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('NO. 2 HB GRAPHITE • PENCIL 3D', bounds.width - 20, bounds.height - 18);

    var link = document.createElement('a');
    link.download = 'pencil-sketch-' + Date.now() + '.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  /* -------------------------------------------------------------
     5. Trackpad Status Badge
  ------------------------------------------------------------- */
  function updateTrackpadBadge(active) {
    var badge = document.getElementById('trackpad-badge');
    if (!badge) return;
    if (active) {
      badge.classList.add('active-drawing');
      badge.innerHTML = '<span>✍️ <strong>Drawing...</strong> (Release Space or Trackpad to lift)</span>';
    } else {
      badge.classList.remove('active-drawing');
      badge.innerHTML = '<span>🖐️ Trackpad: Hold <kbd>Space</kbd> or Click to Draw</span>';
    }
  }

  /* -------------------------------------------------------------
     6. Event Handlers (Pointer, Mouse, Touch, Trackpad, Keyboard)
  ------------------------------------------------------------- */
  function onPointerMove(e) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    // Trackpad Force Touch / Pointer pressure
    if (e.pressure && e.pressure > 0) {
      currentPressure = Math.min(2.0, Math.max(0.6, e.pressure * 2));
    }

    updatePencilTransform(lastMouseX, lastMouseY);

    if (isDrawing) {
      continueSketchStroke(lastMouseX, lastMouseY);
    }
  }

  function onPointerDown(e) {
    if (isInteractingWithUI) return;
    if (e.button && e.button !== 0) return; // Only primary button

    isMouseDown = true;
    startSketchStroke(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    isMouseDown = false;
    if (!isSpaceDown) {
      endSketchStroke();
    }
  }

  function onTouchStart(e) {
    if (isInteractingWithUI) return;
    if (e.touches.length > 0) {
      var t = e.touches[0];
      lastMouseX = t.clientX;
      lastMouseY = t.clientY;
      updatePencilTransform(lastMouseX, lastMouseY);
      startSketchStroke(t.clientX, t.clientY);
      e.preventDefault();
    }
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      var t = e.touches[0];
      lastMouseX = t.clientX;
      lastMouseY = t.clientY;
      updatePencilTransform(lastMouseX, lastMouseY);
      if (isDrawing) {
        continueSketchStroke(t.clientX, t.clientY);
      }
      e.preventDefault();
    }
  }

  function onTouchEnd() {
    endSketchStroke();
  }

  function onKeyDown(e) {
    // Spacebar Glide Mode
    if (e.code === 'Space' && !e.repeat && !isInteractingWithUI) {
      e.preventDefault();
      isSpaceDown = true;
      if (!isDrawing) {
        startSketchStroke(lastMouseX, lastMouseY);
      }
    }
    // Undo: ⌘Z / Ctrl+Z
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undoLastStroke();
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      isSpaceDown = false;
      if (!isMouseDown) {
        endSketchStroke();
      }
    }
  }

  function onResize() {
    wW = window.innerWidth;
    wH = window.innerHeight;

    var padMargin = wW < 768 ? 20 : 50;
    var sketchpad = document.getElementById('sketchpad');
    if (sketchpad) {
      sketchpad.style.left = padMargin + 'px';
      sketchpad.style.top = padMargin + 'px';
      sketchpad.style.width = (wW - padMargin * 2) + 'px';
      sketchpad.style.height = (wH - padMargin * 2) + 'px';
    }

    if (sketchCanvas) {
      sketchCanvas.width = wW;
      sketchCanvas.height = wH;
      redrawAllStrokes();
    }

    if (pencilCanvas && renderer && camera) {
      pencilCanvas.width = wW;
      pencilCanvas.height = wH;
      renderer.setSize(wW, wH);
      camera.aspect = wW / wH;
      camera.updateProjectionMatrix();
    }

    updatePencilTransform(lastMouseX, lastMouseY);
  }

  /* -------------------------------------------------------------
     7. Toolbar & UI Wiring
  ------------------------------------------------------------- */
  function setupUI() {
    var toolbar = document.getElementById('toolbar');
    if (toolbar) {
      toolbar.addEventListener('pointerenter', function() { isInteractingWithUI = true; });
      toolbar.addEventListener('pointerleave', function() { isInteractingWithUI = false; });
      toolbar.addEventListener('mouseenter', function() { isInteractingWithUI = true; });
      toolbar.addEventListener('mouseleave', function() { isInteractingWithUI = false; });
    }

    // Color Swatches
    var swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(function(swatch) {
      swatch.addEventListener('click', function(e) {
        e.stopPropagation();
        swatches.forEach(function(s) { s.classList.remove('active'); });
        swatch.classList.add('active');
        currentColor = swatch.getAttribute('data-color');
        setPencilTipColor(currentColor);
      });
    });

    // Stroke Size Buttons
    var sizeBtns = document.querySelectorAll('.size-btn');
    sizeBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        sizeBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentStrokeSize = parseFloat(btn.getAttribute('data-size') || '5');
      });
    });

    // Action Buttons
    var undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
      undoBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        undoLastStroke();
      });
    }

    var clearBtn = document.getElementById('btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        clearAllStrokes();
      });
    }

    var exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        exportSketchPNG();
      });
    }

    // Auto-fade intro card smoothly
    var intro = document.getElementById('intro');
    if (intro) {
      setTimeout(function() {
        intro.style.transition = 'opacity 0.6s ease';
        intro.style.opacity = '0';
        setTimeout(function() {
          intro.style.display = 'none';
        }, 600);
      }, 1000);
    }
  }

  /* -------------------------------------------------------------
     8. 60FPS WebGL Animation Loop
  ------------------------------------------------------------- */
  function render() {
    requestAnimationFrame(render);

    try {
      if (pencilRoot) {
        // Smoothly interpolate elevation (z)
        pencilRoot.position.z += (targetElevation - pencilRoot.position.z) * 0.28;
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    } catch (err) {
      console.warn("Render loop warning:", err);
    }
  }

  /* -------------------------------------------------------------
     9. Application Bootstrap
  ------------------------------------------------------------- */
  function init() {
    initSketchCanvas();
    buildPencilScene();
    onResize();

    // Attach event listeners immediately
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // Apple Force Touch pressure
    window.addEventListener('webkitmouseforcechanged', function(e) {
      if (typeof e.webkitForce === 'number') {
        currentPressure = Math.min(2.2, Math.max(0.6, e.webkitForce));
      }
    });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    setupUI();

    // Position pencil at center initially
    updatePencilTransform(wW * 0.6, wH * 0.5);

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);