const THREE = window.THREE;

const MU = 398600.4418;
const V_INFINITY = 8;
const IMPACT_PARAMETER = 12000;
const START_RANGE = 150000;
const PLANET_SPEED = 29.78;
const ORBIT_RADIUS = 13;
const SCALE = 18000;
const YEAR_SECONDS = 365.25 * 86400;
const ORBIT_VISUAL_FACTOR = 120;
const STEP_SECONDS = 10;
const RUN_SECONDS_PER_REAL_SECOND = 700;

const $ = (id) => document.getElementById(id);
const canvasHost = $('simulation-canvas');
const wrap = $('canvas-wrap');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
else if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.domElement.setAttribute('aria-label', '3D gravity assist scene. Drag to orbit, use the wheel to zoom.');
canvasHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#050d18');
scene.fog = new THREE.FogExp2('#050d18', 0.0028);
const camera = new THREE.PerspectiveCamera(43, canvasHost.clientWidth / canvasHost.clientHeight, 0.1, 900);
camera.position.set(0, 8.5, 17);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 5;
controls.maxDistance = 75;
controls.maxPolarAngle = Math.PI * 0.88;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0x9db6d2, 0.75));
const keyLight = new THREE.DirectionalLight(0xcde9ff, 2.7);
keyLight.position.set(-8, 12, 15);
scene.add(keyLight);
const fillLight = new THREE.PointLight(0x397fc0, 3, 34);
fillLight.position.set(5, -3, 4);
scene.add(fillLight);

function makeStars() {
  const positions = [];
  for (let i = 0; i < 900; i++) {
    const radius = 50 + Math.random() * 170;
    const theta = Math.random() * Math.PI * 2;
    const z = (Math.random() * 2 - 1) * 120;
    positions.push(Math.cos(theta) * radius, Math.sin(theta) * radius, z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xb9d2ec, size: 0.11, transparent: true, opacity: 0.8, sizeAttenuation: true });
  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}
const stars = makeStars();

function createEarthTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const ocean = ctx.createLinearGradient(0, 0, 0, 512);
  ocean.addColorStop(0, '#5bb5cb'); ocean.addColorStop(.5, '#17618b'); ocean.addColorStop(1, '#09284b');
  ctx.fillStyle = ocean; ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 65; i++) {
    const x = Math.random() * c.width, y = Math.random() * c.height;
    const w = 22 + Math.random() * 115, h = 8 + Math.random() * 52;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, Math.random() * 2, 0, Math.PI * 2);
    ctx.fillStyle = ['#58a878', '#9ab96c', '#d2c780', '#277f70'][i % 4];
    ctx.fill();
  }
  const cloud = ctx.createLinearGradient(0, 0, c.width, c.height);
  cloud.addColorStop(0, '#d5f7f722'); cloud.addColorStop(.52, '#ffffff05'); cloud.addColorStop(1, '#d5f7f72c');
  ctx.fillStyle = cloud; ctx.fillRect(0, 0, c.width, c.height);
  const texture = new THREE.CanvasTexture(c);
  if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
  return texture;
}
const planetGroup = new THREE.Group();
scene.add(planetGroup);
const planet = new THREE.Mesh(new THREE.SphereGeometry(6371 / SCALE, 64, 48), new THREE.MeshStandardMaterial({ map: createEarthTexture(), roughness: 0.86, metalness: 0.02 }));
planet.rotation.z = 0.38;
planetGroup.add(planet);
const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(6371 / SCALE * 1.09, 48, 32), new THREE.MeshBasicMaterial({ color: 0x47b7ed, transparent: true, opacity: 0.13, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
planetGroup.add(atmosphere);
const cloudHalo = new THREE.Mesh(new THREE.SphereGeometry(6371 / SCALE * 1.16, 48, 32), new THREE.MeshBasicMaterial({ color: 0x68b9ee, transparent: true, opacity: 0.065, side: THREE.BackSide, depthWrite: false }));
planetGroup.add(cloudHalo);

const sunGroup = new THREE.Group();
scene.add(sunGroup);
const sun = new THREE.Mesh(new THREE.SphereGeometry(0.88, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffcf93 }));
sunGroup.add(sun);
const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(1.28, 32, 24), new THREE.MeshBasicMaterial({ color: 0xff9f63, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false }));
sunGroup.add(sunGlow);
const sunLight = new THREE.PointLight(0xffbd79, 18, 85, 1.4);
sunGroup.add(sunLight);

const orbitMaterial = new THREE.LineDashedMaterial({ color: 0x89a9bc, transparent: true, opacity: 0.37, dashSize: 0.38, gapSize: 0.27 });
const orbitPoints = [];
for (let i = 0; i <= 300; i++) {
  const a = i / 300 * Math.PI * 2;
  orbitPoints.push(new THREE.Vector3(ORBIT_RADIUS * Math.cos(a), ORBIT_RADIUS * Math.sin(a), 0));
}
const orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPoints), orbitMaterial);
orbitLine.computeLineDistances();
scene.add(orbitLine);

const grid = new THREE.GridHelper(48, 24, 0x38556c, 0x1b3043);
grid.rotation.x = Math.PI / 2;
grid.position.z = -0.55;
const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
gridMaterials.forEach(m => { m.transparent = true; m.opacity = 0.32; });
scene.add(grid);

const ship = new THREE.Group();
scene.add(ship);
const hullMat = new THREE.MeshStandardMaterial({ color: 0xe4edf2, metalness: 0.7, roughness: 0.28, emissive: 0x14202c });
const hull = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.42, 8), hullMat);
hull.rotation.z = -Math.PI / 2;
ship.add(hull);
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.08, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0xaab6bd, metalness: .65, roughness: .3 }));
body.rotation.z = Math.PI / 2;
ship.add(body);
for (const side of [-1, 1]) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(.22, .008, .105), new THREE.MeshStandardMaterial({ color: 0x3b80a7, metalness: .35, roughness: .4, emissive: 0x0a1e32 }));
  panel.position.set(0, side * .13, 0); ship.add(panel);
}
const shipLight = new THREE.PointLight(0xd9f6ff, 0.5, 1.8);
ship.add(shipLight);

function arrow(color, length = 1) {
  const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), length, color, .22, .13);
  scene.add(a); return a;
}
const velocityPlanetArrow = arrow(0xb33a1c, 1);
const velocityRelativeArrow = arrow(0xbc8966, 1);
const velocityResultArrow = arrow(0xcecece, 1);
const velocityIncomingArrow = arrow(0xcd9fa2, 1);

let frame = 'planet';
let running = false;
let paused = false;
let completed = false;
let elapsed = 0;
let accumulator = 0;
let speedMultiplier = 1;
let trajectory = [];
let closestDistance = Infinity;
let closestAt = 0;
let relativePosition;
let relativeVelocity;
let incomingVelocity;
let flightBoundary = 0;
let departureVelocity = null;
let cameraFocus = 'planet';
let lastTimestamp = performance.now();
let targetCamera = null;

const u = new THREE.Vector2(Math.cos(-55 * Math.PI / 180), Math.sin(-55 * Math.PI / 180));
const n = new THREE.Vector2(-u.y, u.x);
function initialState() {
  let offset = IMPACT_PARAMETER;
  for (let i = 0; i < 4; i++) {
    const radius = Math.hypot(START_RANGE, offset);
    const speed = Math.sqrt(V_INFINITY ** 2 + 2 * MU / radius);
    offset = IMPACT_PARAMETER * V_INFINITY / speed;
  }
  const p = new THREE.Vector2(-START_RANGE * u.x - offset * n.x, -START_RANGE * u.y - offset * n.y);
  const speedAtStart = Math.sqrt(V_INFINITY ** 2 + 2 * MU / p.length());
  const v = new THREE.Vector2(speedAtStart * u.x, speedAtStart * u.y);
  return { p, v };
}

function accel(p) {
  const r2 = Math.max(p.lengthSq(), 1);
  const scale = -MU / (r2 * Math.sqrt(r2));
  return new THREE.Vector2(p.x * scale, p.y * scale);
}
function rk4(p, v, dt) {
  const a1 = accel(p);
  const k1p = v.clone(), k1v = a1;
  const p2 = p.clone().addScaledVector(k1p, dt / 2), v2 = v.clone().addScaledVector(k1v, dt / 2);
  const k2p = v2, k2v = accel(p2);
  const p3 = p.clone().addScaledVector(k2p, dt / 2), v3 = v.clone().addScaledVector(k2v, dt / 2);
  const k3p = v3, k3v = accel(p3);
  const p4 = p.clone().addScaledVector(k3p, dt), v4 = v.clone().addScaledVector(k3v, dt);
  const k4p = v4, k4v = accel(p4);
  p.addScaledVector(k1p, dt / 6).addScaledVector(k2p, dt / 3).addScaledVector(k3p, dt / 3).addScaledVector(k4p, dt / 6);
  v.addScaledVector(k1v, dt / 6).addScaledVector(k2v, dt / 3).addScaledVector(k3v, dt / 3).addScaledVector(k4v, dt / 6);
}
function freshRun() {
  const state = initialState();
  relativePosition = state.p; relativeVelocity = state.v; incomingVelocity = state.v.clone();
  flightBoundary = relativePosition.length();
  departureVelocity = null; elapsed = 0; accumulator = 0; closestDistance = Infinity; closestAt = 0;
  trajectory = [{ p: relativePosition.clone(), t: 0 }]; running = false; paused = false; completed = false;
  setStatus('READY FOR INSERTION', 'ready');
  setPhase(0); updateTelemetry(); drawPath(); updateVectors(); placeBodies(); updateProgress(); updatePlayButton();
}
function setStatus(value, cls) {
  $('status-text').textContent = value;
  $('status-dot').parentElement.classList.toggle('paused', cls === 'paused');
  $('status-dot').parentElement.classList.toggle('complete', cls === 'complete');
}
function setPhase(i) {
  const names = ['APPROACH', 'CLOSEST APPROACH', 'DEPARTURE'];
  $('phase-chip').textContent = names[i];
  document.querySelectorAll('.sequence-item').forEach((el, n) => {
    el.classList.toggle('active', n === i);
    el.classList.toggle('passed', n < i);
  });
}
function updatePlayButton() {
  const button = $('play-toggle');
  button.querySelector('b').textContent = completed ? 'Replay' : running ? 'Pause' : paused ? 'Resume' : 'Start';
  button.querySelector('.play-symbol').textContent = running ? 'Ⅱ' : '▶';
  button.setAttribute('aria-label', completed ? 'Replay simulation' : running ? 'Pause simulation' : paused ? 'Resume simulation' : 'Start simulation');
}
function startRun() {
  if (completed) freshRun();
  running = true; paused = false; completed = false;
  setStatus('FLIGHT IN PROGRESS', 'running'); updatePlayButton();
}
function pauseRun() {
  if (!running) return;
  running = false; paused = true; setStatus('SIMULATION PAUSED', 'paused'); updatePlayButton();
}
function resumeRun() {
  if (completed) return;
  if (paused || !running) { running = true; paused = false; setStatus('FLIGHT IN PROGRESS', 'running'); updatePlayButton(); }
}
function finishRun() {
  running = false; paused = false; completed = true; departureVelocity = relativeVelocity.clone();
  setStatus('ENCOUNTER COMPLETE', 'complete'); setPhase(2); updateTelemetry(); updateVectors(); updateProgress(); updatePlayButton();
}

function pointForFrame(p, t = elapsed) {
  const localX = p.x / SCALE, localY = p.y / SCALE;
  if (frame === 'planet') return new THREE.Vector3(localX, localY, 0);
  const theta = t / YEAR_SECONDS * Math.PI * 2 * ORBIT_VISUAL_FACTOR;
  const radial = new THREE.Vector2(Math.cos(theta), Math.sin(theta));
  const tangent = new THREE.Vector2(-Math.sin(theta), Math.cos(theta));
  return new THREE.Vector3(ORBIT_RADIUS * radial.x + tangent.x * localX + radial.x * localY, ORBIT_RADIUS * radial.y + tangent.y * localX + radial.y * localY, 0);
}
function currentPlanetPosition(t = elapsed) {
  if (frame === 'planet') return new THREE.Vector3(0, 0, 0);
  const theta = t / YEAR_SECONDS * Math.PI * 2 * ORBIT_VISUAL_FACTOR;
  return new THREE.Vector3(ORBIT_RADIUS * Math.cos(theta), ORBIT_RADIUS * Math.sin(theta), 0);
}
function renderedStarVelocityComponents() {
  // Star-frame orbit motion is intentionally accelerated for presentation.
  // Differentiate the same position transform used by pointForFrame so the
  // 3D arrows and spacecraft heading stay tangent to the displayed path.
  const omega = omegaForView();
  return new THREE.Vector2(
    relativeVelocity.x + omega * (ORBIT_RADIUS * SCALE + relativePosition.y),
    relativeVelocity.y - omega * relativePosition.x
  );
}
function focusPosition(target = cameraFocus) {
  if (target === 'sun') return new THREE.Vector3(0, 0, -0.7);
  if (target === 'spacecraft') return pointForFrame(relativePosition);
  return currentPlanetPosition();
}
function setArrow(a, origin, vector, pxPerKm, minLength = .45, maxLength = 4.6) {
  const direction = new THREE.Vector3(vector.x, vector.y, 0);
  const magnitude = direction.length();
  const length = THREE.MathUtils.clamp(magnitude * pxPerKm, minLength, maxLength);
  if (magnitude > 1e-6) direction.normalize(); else direction.set(1, 0, 0);
  a.position.copy(origin); a.setDirection(direction); a.setLength(length, Math.min(.32, length * .23), Math.min(.2, length * .16));
}
function updateVelocityDiagram() {
  const scale = 3.35;
  const originX = 18;
  const originY = 73;
  const planetX = originX + PLANET_SPEED * scale;
  const resultX = originX + (PLANET_SPEED + relativeVelocity.x) * scale;
  const resultY = originY - relativeVelocity.y * scale;
  const setLine = (id, x1, y1, x2, y2) => {
    const line = $(id);
    line.setAttribute('x1', x1.toFixed(1)); line.setAttribute('y1', y1.toFixed(1));
    line.setAttribute('x2', x2.toFixed(1)); line.setAttribute('y2', y2.toFixed(1));
  };
  setLine('diagram-planet', originX, originY, planetX, originY);
  setLine('diagram-relative', planetX, originY, resultX, resultY);
  setLine('diagram-result', originX, originY, resultX, resultY);
  $('diagram-origin').setAttribute('cx', originX); $('diagram-origin').setAttribute('cy', originY);
  $('diagram-planet-value').textContent = PLANET_SPEED.toFixed(2);
  $('diagram-relative-value').textContent = relativeVelocity.length().toFixed(2);
  $('diagram-result-value').textContent = calcStarSpeed(relativeVelocity).toFixed(2);
}
function updateVectors() {
  const visible = $('toggle-vectors').checked;
  velocityPlanetArrow.visible = visible && frame === 'star';
  velocityRelativeArrow.visible = visible && frame === 'star';
  velocityResultArrow.visible = visible && frame === 'star';
  velocityIncomingArrow.visible = visible && frame === 'planet';
  if (!visible) return;
  const shipPoint = pointForFrame(relativePosition);
  const pPoint = currentPlanetPosition();
  const localScale = frame === 'planet' ? .11 : .06;
  if (frame === 'planet') {
    setArrow(velocityIncomingArrow, shipPoint, relativeVelocity, localScale, .35, 2.2);
    return;
  }
  const theta = elapsed / YEAR_SECONDS * Math.PI * 2 * ORBIT_VISUAL_FACTOR;
  const tangent = new THREE.Vector2(-Math.sin(theta), Math.cos(theta));
  const radial = new THREE.Vector2(Math.cos(theta), Math.sin(theta));
  const displayRelative = new THREE.Vector2(
    relativeVelocity.x + omegaForView() * relativePosition.y,
    relativeVelocity.y - omegaForView() * relativePosition.x
  );
  const displayPlanet = omegaForView() * ORBIT_RADIUS * SCALE;
  const planetVel = tangent.clone().multiplyScalar(displayPlanet);
  const relVelWorld = tangent.clone().multiplyScalar(displayRelative.x).add(radial.clone().multiplyScalar(displayRelative.y));
  const starComponents = renderedStarVelocityComponents();
  const starVel = tangent.clone().multiplyScalar(starComponents.x).add(radial.clone().multiplyScalar(starComponents.y));
  setArrow(velocityPlanetArrow, pPoint, planetVel, .06, .65, 3.2);
  setArrow(velocityRelativeArrow, pPoint, relVelWorld, .06, .35, 1.5);
  setArrow(velocityResultArrow, shipPoint, starVel, .06, .8, 3.4);
  setArrow(velocityIncomingArrow, shipPoint, relVelWorld, .095, 1.0, 2.4);
  velocityIncomingArrow.visible = false;
}
function omegaForView() { return Math.PI * 2 * ORBIT_VISUAL_FACTOR / YEAR_SECONDS; }
function drawPath() {
  const visible = $('toggle-trail').checked;
  if (ship.userData.pathLine) { scene.remove(ship.userData.pathLine); ship.userData.pathLine.geometry.dispose(); }
  if (!visible || trajectory.length < 2) { ship.userData.pathLine = null; return; }
  const pts = trajectory.map(sample => pointForFrame(sample.p, sample.t));
  const geometry = new THREE.BufferGeometry().setFromPoints(pts);
  const material = new THREE.LineBasicMaterial({ color: 0xbc8966, transparent: true, opacity: .9 });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances?.(); scene.add(line); ship.userData.pathLine = line;
}
function placeBodies() {
  const planetPos = currentPlanetPosition();
  planetGroup.position.copy(planetPos);
  sunGroup.position.set(0, 0, -0.7);
  const shipPos = pointForFrame(relativePosition);
  ship.position.copy(shipPos);
  const dir = frame === 'planet'
    ? new THREE.Vector3(relativeVelocity.x, relativeVelocity.y, 0)
    : (() => {
        const theta = elapsed / YEAR_SECONDS * Math.PI * 2 * ORBIT_VISUAL_FACTOR;
        const tangent = new THREE.Vector2(-Math.sin(theta), Math.cos(theta));
        const radial = new THREE.Vector2(Math.cos(theta), Math.sin(theta));
        const velocity = renderedStarVelocityComponents();
        return new THREE.Vector3(tangent.x * velocity.x + radial.x * velocity.y, tangent.y * velocity.x + radial.y * velocity.y, 0);
      })();
  hull.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  planet.rotation.y += running ? .002 : .00015;
  if (frame === 'star') sunGroup.visible = true; else sunGroup.visible = false;
  orbitLine.visible = frame === 'star' && $('toggle-orbit').checked;
  grid.visible = $('toggle-grid').checked;
}
function calcStarSpeed(relative) {
  const vx = PLANET_SPEED + relative.x;
  return Math.hypot(vx, relative.y);
}
function formatTime(s) {
  const minutes = Math.floor(s / 60);
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
function updateTelemetry() {
  const range = relativePosition.length();
  const altitude = Math.max(0, range - 6371);
  const starSpeed = calcStarSpeed(relativeVelocity);
  $('telemetry-speed').innerHTML = `${starSpeed.toFixed(2)}<small> km/s</small>`;
  $('telemetry-altitude').innerHTML = `${Math.round(altitude).toLocaleString()} <small>km</small>`;
  $('telemetry-range').innerHTML = `${Math.round(range).toLocaleString()} <small>km</small>`;
  $('telemetry-relative').innerHTML = `${relativeVelocity.length().toFixed(2)} <small>km/s</small>`;
  $('telemetry-time').innerHTML = `${formatTime(elapsed)} <small>h:m</small>`;
  const inStarSpeed = calcStarSpeed(incomingVelocity);
  const change = starSpeed - inStarSpeed;
  $('speed-change').textContent = completed ? `Net gain +${change.toFixed(2)} km/s` : running || elapsed > 0 ? `${change >= 0 ? '+' : ''}${change.toFixed(2)} km/s from start` : 'Awaiting flyby';
  $('speed-change').style.color = change >= 0 ? '#5a2014' : '#b33a1c';
  updateVelocityDiagram();
}
function updateProgress() {
  const percent = completed ? 100 : Math.min(99, Math.round(elapsed / 35400 * 100));
  $('progress-label').textContent = `${percent}%`;
  $('progress-bar').style.width = `${percent}%`;
}
function advance(dt) {
  const oldRange = relativePosition.length();
  rk4(relativePosition, relativeVelocity, dt);
  elapsed += dt;
  const r = relativePosition.length();
  if (r < closestDistance) { closestDistance = r; closestAt = elapsed; }
  if (Math.floor(elapsed / 125) !== Math.floor((elapsed - dt) / 125)) {
    trajectory.push({ p: relativePosition.clone(), t: elapsed });
    if (trajectory.length > 1400) trajectory.shift();
  }
  if (elapsed > closestAt && r > flightBoundary && oldRange < flightBoundary && elapsed > 18000) finishRun();
  if (elapsed > 220000) finishRun();
  const phase = r < 17000 ? 1 : (elapsed > closestAt && r > 25000 ? 2 : 0);
  setPhase(phase);
}

function resetCamera() {
  controls.reset();
  const target = frame === 'planet' ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, 0, 0);
  cameraFocus = frame === 'planet' ? 'planet' : 'sun';
  $('center-select').value = cameraFocus;
  controls.target.copy(target);
  camera.position.set(0, frame === 'planet' ? 8.5 : 24, frame === 'planet' ? 17 : 48);
  camera.lookAt(target);
  controls.update();
}
function setCameraFocus(target) {
  if (target === 'sun' && frame !== 'star') switchFrame('star');
  cameraFocus = target;
  $('center-select').value = target;
  if (target === 'free') return;
  const offset = camera.position.clone().sub(controls.target);
  const targetPosition = focusPosition(target);
  controls.target.copy(targetPosition);
  camera.position.copy(targetPosition.clone().add(offset));
  controls.update();
}
function switchFrame(next) {
  if (frame === next) return;
  frame = next;
  document.querySelectorAll('.frame-btn').forEach(btn => {
    const active = btn.dataset.frame === frame;
    btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active));
  });
  $('frame-chip').textContent = frame === 'planet' ? 'PLANET-CENTRED VIEW' : 'STAR-CENTRED VIEW';
  $('scale-label').textContent = frame === 'planet' ? '20,000 km' : '1 AU · not to flyby scale';
  $('frame-note').textContent = frame === 'planet' ? 'Planet frame: arrows follow the physical relative path; far-field relative speed is conserved.' : 'Star view arrows follow the accelerated display path. The inset shows the physical sum: vplanet + vsc,planet = vsc,star.';
  cameraFocus = frame === 'planet' ? 'planet' : 'sun';
  $('center-select').value = cameraFocus;
  $('center-select').querySelector('option[value="sun"]').disabled = frame !== 'star';
  if (frame === 'star') {
    camera.position.set(0, 22, 48); controls.target.set(0, 0, 0); controls.minDistance = 18; controls.maxDistance = 95;
  } else {
    camera.position.set(0, 8.5, 17); controls.target.set(0, 0, 0); controls.minDistance = 5; controls.maxDistance = 75;
  }
  camera.lookAt(controls.target); controls.update();
  placeBodies(); drawPath(); updateVectors();
}

document.querySelectorAll('.frame-btn').forEach(btn => btn.addEventListener('click', () => switchFrame(btn.dataset.frame)));
$('center-select').addEventListener('change', event => setCameraFocus(event.target.value));
$('play-toggle').addEventListener('click', () => {
  if (running) pauseRun();
  else if (completed) startRun();
  else if (paused) resumeRun();
  else startRun();
});
$('reset-btn').addEventListener('click', freshRun);
$('camera-reset').addEventListener('click', resetCamera);
$('center-select').querySelector('option[value="sun"]').disabled = frame !== 'star';
$('speed-slider').addEventListener('input', event => { speedMultiplier = Number(event.target.value); $('speed-value').textContent = `${speedMultiplier}×`; });
for (const id of ['toggle-vectors', 'toggle-trail', 'toggle-orbit', 'toggle-grid']) {
  $(id).addEventListener('change', () => { updateVectors(); drawPath(); placeBodies(); });
}
$('fullscreen-btn').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await $('simulator').requestFullscreen();
    else await document.exitFullscreen();
  } catch { wrap.classList.toggle('expanded'); }
});
window.addEventListener('keydown', event => {
  if (event.code === 'Space' && !['INPUT', 'BUTTON'].includes(document.activeElement.tagName)) { event.preventDefault(); running ? pauseRun() : resumeRun(); }
});
window.addEventListener('resize', () => {
  const w = canvasHost.clientWidth, h = canvasHost.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
});
let activeTouchPointers = 0;
renderer.domElement.addEventListener('pointerdown', event => {
  if (event.button === 2 || event.shiftKey || (event.pointerType === 'touch' && ++activeTouchPointers > 1)) {
    cameraFocus = 'free'; $('center-select').value = 'free';
  }
});
window.addEventListener('pointerup', event => { if (event.pointerType === 'touch') activeTouchPointers = Math.max(0, activeTouchPointers - 1); });

function animate(now) {
  requestAnimationFrame(animate);
  const realDelta = Math.min((now - lastTimestamp) / 1000, .08);
  lastTimestamp = now;
  if (running) {
    accumulator += realDelta * RUN_SECONDS_PER_REAL_SECOND * speedMultiplier;
    while (accumulator >= STEP_SECONDS && running) { advance(STEP_SECONDS); accumulator -= STEP_SECONDS; }
    updateTelemetry(); updateProgress();
    if (Math.floor(elapsed / 125) !== Math.floor((elapsed - STEP_SECONDS) / 125)) drawPath();
  }
  placeBodies(); updateVectors();
  if (cameraFocus !== 'free') {
    const nextTarget = focusPosition();
    const shift = nextTarget.clone().sub(controls.target);
    controls.target.copy(nextTarget);
    camera.position.add(shift);
  }
  if (ship.userData.pathLine && trajectory.length > 1) {
    const pts = trajectory.map(sample => pointForFrame(sample.p, sample.t));
    ship.userData.pathLine.geometry.setFromPoints(pts);
  }
  stars.rotation.z += realDelta * .001;
  controls.update(); renderer.render(scene, camera);
}

freshRun();
$('loading-state').remove();
requestAnimationFrame(animate);
