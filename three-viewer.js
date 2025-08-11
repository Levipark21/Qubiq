import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Variables globales ---
let renderer, scene, camera, model, animationId;
let controls, mode = 'orbitar';
let moveJoystick, lookJoystick;
let joystickActive = false;
let movement = { forward: 0, right: 0, turnX: 0, turnY: 0 };

// --- Pantalla completa ---
export function setFullscreen() {
  const el = renderer ? renderer.domElement : document.body;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

// --- Cambia el modo de controles ---
export function setThreeMode(newMode, joystickContainer) {
  mode = newMode;
  if (mode === 'orbitar') {
    if (controls) controls.enabled = true;
    if (joystickContainer) joystickContainer.style.display = 'none';
    joystickActive = false;
  } else {
    if (controls) controls.enabled = false;
    if (joystickContainer) {
      joystickContainer.style.display = '';
      setupJoysticks(joystickContainer);
    }
    joystickActive = true;
  }
}

// --- Detección AR igual que antes ---
export async function isARSupported() { /* ... igual que antes ... */ }

// --- Limpieza igual que antes ---
export function clearThree(container) { /* ... igual que antes ... */ }

// --- Carga del modelo igual que antes, pero ahora incluye controles ---
export async function loadGLBToThree(url, container, onLoaded = () => {}) {
  // ... igual que antes ...
  // Añade controles Orbit
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = false;
  controls.target.set(0, 0.5, 0);
  controls.update();

  // ... resto igual ...
  animate();
}

// --- Animación principal ---
function animate() {
  animationId = requestAnimationFrame(animate);

  // Modo recorrido
  if (mode === 'recorrido' && camera && joystickActive) {
    // Movimiento
    const moveSpeed = 0.05;
    const turnSpeed = 0.025;
    // Adelante/atrás/izquierda/derecha relativo al Yaw de la cámara
    const yaw = camera.rotation.y;
    camera.position.x += (Math.sin(yaw) * movement.forward + Math.cos(yaw) * movement.right) * moveSpeed;
    camera.position.z += (Math.cos(yaw) * movement.forward - Math.sin(yaw) * movement.right) * moveSpeed;
    // Rotación (giro horizontal y vertical)
    camera.rotation.y -= movement.turnX * turnSpeed;
    camera.rotation.x -= movement.turnY * turnSpeed;
    // Limitar el pitch
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
  }

  if (controls && controls.enabled) controls.update();
  renderer.render(scene, camera);
}

// --- Setup Joysticks ---
export function setupJoysticks(container) {
  container.innerHTML = `
    <div id="moveJoystick" style="position:absolute;left:40px;bottom:40px;width:120px;height:120px;pointer-events:auto;"></div>
    <div id="lookJoystick" style="position:absolute;right:40px;bottom:40px;width:120px;height:120px;pointer-events:auto;"></div>
  `;
  createJoystick(document.getElementById('moveJoystick'), (x, y) => {
    movement.forward = -y; // y: arriba es -1, abajo es 1
    movement.right = x;    // x: izquierda -1, derecha 1
  });
  createJoystick(document.getElementById('lookJoystick'), (x, y) => {
    movement.turnX = x;
    movement.turnY = y;
  });
}

// --- Joystick desde cero (táctil/mouse) ---
function createJoystick(container, onChange) {
  let dragging = false, startX = 0, startY = 0, lastX = 0, lastY = 0;
  const knob = document.createElement('div');
  Object.assign(knob.style, {
    width: '60px', height: '60px', background: '#8888', borderRadius: '50%',
    position: 'absolute', left: '30px', top: '30px', transform: 'translate(0,0)', touchAction: 'none'
  });
  container.style.background = '#ccc6';
  container.style.borderRadius = '50%';

  container.appendChild(knob);

  function handleMove(e) {
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const dx = clientX - startX;
    const dy = clientY - startY;
    // Limita el radio
    const radius = 40;
    let dist = Math.sqrt(dx*dx + dy*dy);
    let angle = Math.atan2(dy, dx);
    let r = Math.min(dist, radius);
    let x = Math.cos(angle) * r;
    let y = Math.sin(angle) * r;
    knob.style.transform = `translate(${x}px,${y}px)`;
    // Normalizados
    onChange(x/radius, y/radius);
    lastX = x; lastY = y;
  }
  function handleEnd() {
    knob.style.transform = `translate(0,0)`;
    onChange(0, 0);
    dragging = false;
  }
  container.addEventListener('touchstart', e => {
    dragging = true;
    if (e.touches) {
      startX = e.touches[0].clientX - lastX;
      startY = e.touches[0].clientY - lastY;
    }
  });
  container.addEventListener('touchmove', e => {
    if (!dragging) return;
    handleMove(e);
    e.preventDefault();
  }, { passive: false });
  container.addEventListener('touchend', e => {
    handleEnd();
  });
  // Mouse para desktop
  container.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX - lastX;
    startY = e.clientY - lastY;
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
  });
  function mouseMove(e) { if (dragging) handleMove(e); }
  function mouseUp(e) { handleEnd(); document.removeEventListener('mousemove', mouseMove); document.removeEventListener('mouseup', mouseUp);}
}