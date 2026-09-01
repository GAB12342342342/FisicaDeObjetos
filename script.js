// ---------- Configuração dos objetos ----------
// mass (kg), radius (m, apenas visual/área), dragCoefficient (adimensional)
const OBJECTS = {
  futebol:  { emoji: '⚽', color: '#f8fafc', mass: 0.43, radius: 0.11, drag: 0.25 },
  basquete: { emoji: '🏀', color: '#f97316', mass: 0.62, radius: 0.12, drag: 0.47 },
  tenis:    { emoji: '🎾', color: '#facc15', mass: 0.058, radius: 0.033, drag: 0.55 },
  canhao:   { emoji: '💣', color: '#1f2937', mass: 8,    radius: 0.10, drag: 0.10 },
  pena:     { emoji: '🪶', color: '#e5e7eb', mass: 0.002, radius: 0.05, drag: 1.9 },
  pedra:    { emoji: '🪨', color: '#6b7280', mass: 1.2,  radius: 0.06, drag: 0.30 },
};

const AIR_DENSITY = 1.225; // kg/m³

// ---------- Elementos do DOM ----------
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const objectSelect = document.getElementById('objectSelect');
const velocityInput = document.getElementById('velocity');
const angleInput = document.getElementById('angle');
const planetSelect = document.getElementById('planet');
const airResistanceCheckbox = document.getElementById('airResistance');
const keepTrailsCheckbox = document.getElementById('keepTrails');
const velocityValue = document.getElementById('velocityValue');
const angleValue = document.getElementById('angleValue');
const launchBtn = document.getElementById('launchBtn');
const resetBtn = document.getElementById('resetBtn');

const maxHeightEl = document.getElementById('maxHeight');
const rangeEl = document.getElementById('range');
const flightTimeEl = document.getElementById('flightTime');

// ---------- Estado ----------
let trails = [];      // trajetórias já finalizadas (mantidas se "manter trajetórias" marcado)
let currentTrail = null;
let animationId = null;
let scale = 8;         // pixels por metro (recalculado a cada lançamento)
const groundMarginPx = 40;

// ---------- Setup do canvas responsivo ----------
function resizeCanvas() {
  const wrapper = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = wrapper.clientWidth * dpr;
  canvas.height = wrapper.clientHeight * dpr;
  canvas.style.width = wrapper.clientWidth + 'px';
  canvas.style.height = wrapper.clientHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene();
}
window.addEventListener('resize', resizeCanvas);

// ---------- Atualização dos labels ----------
velocityInput.addEventListener('input', () => {
  velocityValue.textContent = velocityInput.value;
});
angleInput.addEventListener('input', () => {
  angleValue.textContent = angleInput.value;
});

// ---------- Física ----------
function simulateTrajectory(objectKey, v0, angleDeg, g, useDrag) {
  const obj = OBJECTS[objectKey];
  const angleRad = angleDeg * Math.PI / 180;
  let vx = v0 * Math.cos(angleRad);
  let vy = -v0 * Math.sin(angleRad); // y cresce para baixo no canvas, mas aqui trabalhamos em "mundo": y para cima positivo na física, convertido depois

  // Vamos trabalhar com y física crescendo para cima (padrão físico), converter na hora de desenhar.
  vy = v0 * Math.sin(angleRad);

  const dt = 0.016; // ~60 fps
  const area = Math.PI * obj.radius * obj.radius;

  let x = 0, y = 0, t = 0;
  const points = [{ x, y, t }];
  let maxY = 0;

  const maxSteps = 20000;
  let steps = 0;

  while (y >= 0 && steps < maxSteps) {
    steps++;
    let ax = 0, ay = -g;

    if (useDrag) {
      const speed = Math.sqrt(vx * vx + vy * vy) || 0.0001;
      const dragForce = 0.5 * AIR_DENSITY * obj.drag * area * speed * speed;
      const dragAccel = dragForce / obj.mass;
      ax += -dragAccel * (vx / speed);
      ay += -dragAccel * (vy / speed);
    }

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;

    if (y > maxY) maxY = y;
    points.push({ x, y, t });

    if (t > 60) break; // segurança
  }

  // Corrige o último ponto para pousar exatamente em y=0 (interpolação)
  if (points.length >= 2) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    if (last.y < 0 && prev.y !== last.y) {
      const frac = prev.y / (prev.y - last.y);
      const landX = prev.x + (last.x - prev.x) * frac;
      const landT = prev.t + (last.t - prev.t) * frac;
      points[points.length - 1] = { x: landX, y: 0, t: landT };
    }
  }

  const range = points[points.length - 1].x;
  const flightTime = points[points.length - 1].t;

  return { points, maxHeight: maxY, range, flightTime, obj };
}

// ---------- Desenho ----------
function getGroundY() {
  return (canvas.height / (window.devicePixelRatio || 1)) - groundMarginPx;
}

function drawScene() {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);

  // chão
  const groundY = getGroundY();
  ctx.fillStyle = '#0f2417';
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();

  // trajetórias antigas
  trails.forEach(trail => drawTrail(trail, groundY, 0.35));

  // trajetória atual
  if (currentTrail) drawTrail(currentTrail, groundY, 1);
}

function drawTrail(trail, groundY, alpha) {
  const { points, obj, progress } = trail;
  const visibleCount = progress != null ? progress : points.length;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = obj.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < visibleCount; i++) {
    const p = points[i];
    const px = 20 + p.x * scale;
    const py = groundY - p.y * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // objeto na posição atual
  if (visibleCount > 0) {
    const p = points[Math.min(visibleCount - 1, points.length - 1)];
    const px = 20 + p.x * scale;
    const py = groundY - p.y * scale;
    ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(16, obj.radius * scale * 4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.emoji, px, py);
  }
  ctx.restore();
}

// ---------- Escala automática ----------
function computeScale(range, maxHeight) {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  const usableW = w - 60;
  const usableH = h - groundMarginPx - 40;
  const scaleX = usableW / Math.max(range, 1);
  const scaleY = usableH / Math.max(maxHeight, 1);
  return Math.max(0.5, Math.min(scaleX, scaleY, 60));
}

// ---------- Lançamento ----------
function launch() {
  if (animationId) cancelAnimationFrame(animationId);

  const objectKey = objectSelect.value;
  const v0 = parseFloat(velocityInput.value);
  const angleDeg = parseFloat(angleInput.value);
  const g = parseFloat(planetSelect.value);
  const useDrag = airResistanceCheckbox.checked;

  const result = simulateTrajectory(objectKey, v0, angleDeg, g, useDrag);
  scale = computeScale(result.range, result.maxHeight);

  if (!keepTrailsCheckbox.checked) {
    trails = [];
  } else if (currentTrail) {
    trails.push(currentTrail);
  }

  currentTrail = { ...result, progress: 0 };

  maxHeightEl.textContent = result.maxHeight.toFixed(1) + ' m';
  rangeEl.textContent = result.range.toFixed(1) + ' m';
  flightTimeEl.textContent = result.flightTime.toFixed(2) + ' s';

  animateTrail();
}

function animateTrail() {
  const totalPoints = currentTrail.points.length;
  const stepsPerFrame = Math.max(1, Math.floor(totalPoints / 180)); // termina em ~3s a 60fps

  function step() {
    currentTrail.progress = Math.min(totalPoints, (currentTrail.progress || 0) + stepsPerFrame);
    drawScene();
    if (currentTrail.progress < totalPoints) {
      animationId = requestAnimationFrame(step);
    }
  }
  step();
}

// ---------- Reset ----------
function resetAll() {
  if (animationId) cancelAnimationFrame(animationId);
  trails = [];
  currentTrail = null;
  maxHeightEl.textContent = '–';
  rangeEl.textContent = '–';
  flightTimeEl.textContent = '–';
  drawScene();
}

// ---------- Eventos ----------
launchBtn.addEventListener('click', launch);
resetBtn.addEventListener('click', resetAll);

// ---------- Inicialização ----------
resizeCanvas();