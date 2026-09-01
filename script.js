// =====================================================================
// Imagens de fundo (sorteadas aleatoriamente a cada carregamento)
// =====================================================================
const BACKGROUND_IMAGES = [
  'img/cidade-circular.png',
  'img/casa-campo.png',
];

function setRandomBackground() {
  const bgLayer = document.getElementById('bgLayer');
  if (!bgLayer || BACKGROUND_IMAGES.length === 0) return;

  const chosen = BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];

  const preload = new Image();
  preload.onload = () => {
    bgLayer.style.backgroundImage = `url('${chosen}')`;
    requestAnimationFrame(() => bgLayer.classList.add('loaded'));
  };
  preload.src = chosen;
}

// =====================================================================
// Utilidades numéricas
// =====================================================================
function toNumber(value) {
  if (value === '' || value === null || value === undefined) return NaN;
  return Number(value);
}

function fmt(num, decimals = 3) {
  if (!isFinite(num)) return '—';
  const rounded = Number(num.toFixed(decimals));
  return rounded.toString().replace('.', ',');
}

const G_PRESETS = [
  { label: '🌍 Terra', value: 9.81 },
  { label: '🌕 Lua', value: 1.62 },
  { label: '🔴 Marte', value: 3.71 },
  { label: '🟠 Júpiter', value: 24.79 },
];

// =====================================================================
// Definição dos módulos de cálculo
// Cada módulo descreve: id, nome, descrição, campos de entrada e a
// função compute(values) -> { formula, steps: [...], results: [...] }
// Lança um Error com mensagem amigável quando os valores são inválidos.
// =====================================================================
const CALCULATIONS = [
  {
    id: 'queda_livre',
    name: 'Queda Livre',
    description: 'Calcula o tempo de queda e a velocidade final de um objeto solto de uma certa altura, sem velocidade inicial.',
    fields: [
      { id: 'h', label: 'Altura de queda (h)', unit: 'm', placeholder: 'Ex: 20' },
      { id: 'g', label: 'Gravidade (g)', unit: 'm/s²', placeholder: 'Ex: 9.81', isGravity: true, default: 9.81 },
    ],
    compute(v) {
      const { h, g } = v;
      if (h <= 0) throw new Error('A altura deve ser maior que zero.');
      if (g <= 0) throw new Error('A gravidade deve ser maior que zero.');
      const t = Math.sqrt((2 * h) / g);
      const vf = g * t;
      return {
        formula: 't = √(2h / g)     v = g · t',
        steps: [
          `t = √(2 × ${fmt(h)} / ${fmt(g)}) = √${fmt((2 * h) / g)} = ${fmt(t)} s`,
          `v = ${fmt(g)} × ${fmt(t)} = ${fmt(vf)} m/s`,
        ],
        results: [
          { label: 'Tempo de queda', value: fmt(t), unit: 's' },
          { label: 'Velocidade final', value: fmt(vf), unit: 'm/s' },
        ],
      };
    },
  },

  {
    id: 'lancamento_horizontal',
    name: 'Lançamento Horizontal',
    description: 'Objeto lançado horizontalmente de uma altura, sem ângulo de inclinação. Calcula tempo de voo, alcance e velocidade final.',
    fields: [
      { id: 'h', label: 'Altura de lançamento (h)', unit: 'm', placeholder: 'Ex: 15' },
      { id: 'v0', label: 'Velocidade horizontal inicial (v₀)', unit: 'm/s', placeholder: 'Ex: 12' },
      { id: 'g', label: 'Gravidade (g)', unit: 'm/s²', placeholder: 'Ex: 9.81', isGravity: true, default: 9.81 },
    ],
    compute(v) {
      const { h, v0, g } = v;
      if (h <= 0) throw new Error('A altura deve ser maior que zero.');
      if (v0 < 0) throw new Error('A velocidade não pode ser negativa.');
      if (g <= 0) throw new Error('A gravidade deve ser maior que zero.');
      const t = Math.sqrt((2 * h) / g);
      const x = v0 * t;
      const vy = g * t;
      const vFinal = Math.sqrt(v0 * v0 + vy * vy);
      return {
        formula: 't = √(2h / g)     x = v₀ · t     v = √(v₀² + (g·t)²)',
        steps: [
          `t = √(2 × ${fmt(h)} / ${fmt(g)}) = ${fmt(t)} s`,
          `x = ${fmt(v0)} × ${fmt(t)} = ${fmt(x)} m`,
          `v_y = ${fmt(g)} × ${fmt(t)} = ${fmt(vy)} m/s`,
          `v = √(${fmt(v0)}² + ${fmt(vy)}²) = ${fmt(vFinal)} m/s`,
        ],
        results: [
          { label: 'Tempo de voo', value: fmt(t), unit: 's' },
          { label: 'Alcance horizontal', value: fmt(x), unit: 'm' },
          { label: 'Velocidade final', value: fmt(vFinal), unit: 'm/s' },
        ],
      };
    },
  },

  {
    id: 'lancamento_obliquo',
    name: 'Lançamento Oblíquo',
    description: 'Objeto lançado com um ângulo em relação ao solo. Calcula tempo de voo, altura máxima e alcance horizontal.',
    fields: [
      { id: 'v0', label: 'Velocidade inicial (v₀)', unit: 'm/s', placeholder: 'Ex: 25' },
      { id: 'angle', label: 'Ângulo de lançamento (θ)', unit: '°', placeholder: 'Ex: 45' },
      { id: 'h0', label: 'Altura inicial (h₀)', unit: 'm', placeholder: 'Ex: 0', default: 0 },
      { id: 'g', label: 'Gravidade (g)', unit: 'm/s²', placeholder: 'Ex: 9.81', isGravity: true, default: 9.81 },
    ],
    compute(v) {
      const { v0, angle, h0, g } = v;
      if (v0 <= 0) throw new Error('A velocidade inicial deve ser maior que zero.');
      if (angle <= 0 || angle >= 90) throw new Error('O ângulo deve estar entre 0° e 90° (exclusive).');
      if (h0 < 0) throw new Error('A altura inicial não pode ser negativa.');
      if (g <= 0) throw new Error('A gravidade deve ser maior que zero.');

      const rad = (angle * Math.PI) / 180;
      const vx = v0 * Math.cos(rad);
      const vy0 = v0 * Math.sin(rad);
      const maxHeight = h0 + (vy0 * vy0) / (2 * g);
      // t = [vy0 + sqrt(vy0² + 2 g h0)] / g  (raiz positiva da queda até y = 0)
      const t = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
      const range = vx * t;

      return {
        formula: 'H = h₀ + (v₀·senθ)² / (2g)     t = [v₀·senθ + √((v₀·senθ)² + 2gh₀)] / g     X = v₀·cosθ · t',
        steps: [
          `v₀ₓ = ${fmt(v0)} × cos(${fmt(angle)}°) = ${fmt(vx)} m/s`,
          `v₀ᵧ = ${fmt(v0)} × sen(${fmt(angle)}°) = ${fmt(vy0)} m/s`,
          `H = ${fmt(h0)} + (${fmt(vy0)})² / (2 × ${fmt(g)}) = ${fmt(maxHeight)} m`,
          `t = [${fmt(vy0)} + √(${fmt(vy0)}² + 2×${fmt(g)}×${fmt(h0)})] / ${fmt(g)} = ${fmt(t)} s`,
          `X = ${fmt(vx)} × ${fmt(t)} = ${fmt(range)} m`,
        ],
        results: [
          { label: 'Altura máxima', value: fmt(maxHeight), unit: 'm' },
          { label: 'Tempo de voo', value: fmt(t), unit: 's' },
          { label: 'Alcance horizontal', value: fmt(range), unit: 'm' },
        ],
      };
    },
  },

  {
    id: 'mru',
    name: 'Movimento Retilíneo Uniforme (MRU)',
    description: 'Calcula a velocidade média de um objeto que percorre uma distância em um intervalo de tempo, sem aceleração.',
    fields: [
      { id: 'd', label: 'Distância percorrida (d)', unit: 'm', placeholder: 'Ex: 100' },
      { id: 't', label: 'Tempo gasto (t)', unit: 's', placeholder: 'Ex: 10' },
    ],
    compute(v) {
      const { d, t } = v;
      if (t <= 0) throw new Error('O tempo deve ser maior que zero.');
      const velocity = d / t;
      return {
        formula: 'v = d / t',
        steps: [`v = ${fmt(d)} / ${fmt(t)} = ${fmt(velocity)} m/s`],
        results: [{ label: 'Velocidade média', value: fmt(velocity), unit: 'm/s' }],
      };
    },
  },

  {
    id: 'mruv',
    name: 'Movimento Uniformemente Variado (MRUV)',
    description: 'Calcula a velocidade final e o deslocamento de um objeto com aceleração constante.',
    fields: [
      { id: 'v0', label: 'Velocidade inicial (v₀)', unit: 'm/s', placeholder: 'Ex: 0' },
      { id: 'a', label: 'Aceleração (a)', unit: 'm/s²', placeholder: 'Ex: 2' },
      { id: 't', label: 'Tempo (t)', unit: 's', placeholder: 'Ex: 5' },
    ],
    compute(v) {
      const { v0, a, t } = v;
      if (t < 0) throw new Error('O tempo não pode ser negativo.');
      const vf = v0 + a * t;
      const s = v0 * t + (a * t * t) / 2;
      return {
        formula: 'v = v₀ + a·t     s = v₀·t + a·t² / 2',
        steps: [
          `v = ${fmt(v0)} + ${fmt(a)} × ${fmt(t)} = ${fmt(vf)} m/s`,
          `s = ${fmt(v0)} × ${fmt(t)} + ${fmt(a)} × ${fmt(t)}² / 2 = ${fmt(s)} m`,
        ],
        results: [
          { label: 'Velocidade final', value: fmt(vf), unit: 'm/s' },
          { label: 'Deslocamento', value: fmt(s), unit: 'm' },
        ],
      };
    },
  },

  {
    id: 'newton_2lei',
    name: '2ª Lei de Newton (Força)',
    description: 'Calcula a força resultante necessária para acelerar um objeto de determinada massa.',
    fields: [
      { id: 'm', label: 'Massa do objeto (m)', unit: 'kg', placeholder: 'Ex: 10' },
      { id: 'a', label: 'Aceleração (a)', unit: 'm/s²', placeholder: 'Ex: 3' },
    ],
    compute(v) {
      const { m, a } = v;
      if (m <= 0) throw new Error('A massa deve ser maior que zero.');
      const f = m * a;
      return {
        formula: 'F = m · a',
        steps: [`F = ${fmt(m)} × ${fmt(a)} = ${fmt(f)} N`],
        results: [{ label: 'Força resultante', value: fmt(f), unit: 'N' }],
      };
    },
  },

  {
    id: 'peso',
    name: 'Peso de um Objeto',
    description: 'Calcula a força peso de um objeto em função da sua massa e da gravidade local.',
    fields: [
      { id: 'm', label: 'Massa do objeto (m)', unit: 'kg', placeholder: 'Ex: 70' },
      { id: 'g', label: 'Gravidade (g)', unit: 'm/s²', placeholder: 'Ex: 9.81', isGravity: true, default: 9.81 },
    ],
    compute(v) {
      const { m, g } = v;
      if (m <= 0) throw new Error('A massa deve ser maior que zero.');
      if (g <= 0) throw new Error('A gravidade deve ser maior que zero.');
      const p = m * g;
      return {
        formula: 'P = m · g',
        steps: [`P = ${fmt(m)} × ${fmt(g)} = ${fmt(p)} N`],
        results: [{ label: 'Peso', value: fmt(p), unit: 'N' }],
      };
    },
  },

  {
    id: 'energia_cinetica',
    name: 'Energia Cinética',
    description: 'Calcula a energia associada ao movimento de um objeto, a partir da sua massa e velocidade.',
    fields: [
      { id: 'm', label: 'Massa do objeto (m)', unit: 'kg', placeholder: 'Ex: 5' },
      { id: 'v', label: 'Velocidade (v)', unit: 'm/s', placeholder: 'Ex: 8' },
    ],
    compute(vals) {
      const { m, v } = vals;
      if (m <= 0) throw new Error('A massa deve ser maior que zero.');
      const ec = (m * v * v) / 2;
      return {
        formula: 'Ec = m · v² / 2',
        steps: [`Ec = ${fmt(m)} × ${fmt(v)}² / 2 = ${fmt(ec)} J`],
        results: [{ label: 'Energia cinética', value: fmt(ec), unit: 'J' }],
      };
    },
  },

  {
    id: 'energia_potencial',
    name: 'Energia Potencial Gravitacional',
    description: 'Calcula a energia armazenada por um objeto devido à sua altura em relação ao solo.',
    fields: [
      { id: 'm', label: 'Massa do objeto (m)', unit: 'kg', placeholder: 'Ex: 5' },
      { id: 'h', label: 'Altura (h)', unit: 'm', placeholder: 'Ex: 10' },
      { id: 'g', label: 'Gravidade (g)', unit: 'm/s²', placeholder: 'Ex: 9.81', isGravity: true, default: 9.81 },
    ],
    compute(v) {
      const { m, h, g } = v;
      if (m <= 0) throw new Error('A massa deve ser maior que zero.');
      if (g <= 0) throw new Error('A gravidade deve ser maior que zero.');
      const ep = m * g * h;
      return {
        formula: 'Ep = m · g · h',
        steps: [`Ep = ${fmt(m)} × ${fmt(g)} × ${fmt(h)} = ${fmt(ep)} J`],
        results: [{ label: 'Energia potencial', value: fmt(ep), unit: 'J' }],
      };
    },
  },

  {
    id: 'trabalho',
    name: 'Trabalho de uma Força',
    description: 'Calcula o trabalho realizado por uma força constante que desloca um objeto, considerando o ângulo entre força e deslocamento.',
    fields: [
      { id: 'f', label: 'Força aplicada (F)', unit: 'N', placeholder: 'Ex: 20' },
      { id: 'd', label: 'Deslocamento (d)', unit: 'm', placeholder: 'Ex: 5' },
      { id: 'angle', label: 'Ângulo entre força e deslocamento (θ)', unit: '°', placeholder: 'Ex: 0', default: 0 },
    ],
    compute(v) {
      const { f, d, angle } = v;
      const rad = (angle * Math.PI) / 180;
      const w = f * d * Math.cos(rad);
      return {
        formula: 'W = F · d · cos(θ)',
        steps: [`W = ${fmt(f)} × ${fmt(d)} × cos(${fmt(angle)}°) = ${fmt(w)} J`],
        results: [{ label: 'Trabalho realizado', value: fmt(w), unit: 'J' }],
      };
    },
  },

  {
    id: 'momentum',
    name: 'Quantidade de Movimento (Momentum)',
    description: 'Calcula a quantidade de movimento de um objeto a partir da sua massa e velocidade.',
    fields: [
      { id: 'm', label: 'Massa do objeto (m)', unit: 'kg', placeholder: 'Ex: 3' },
      { id: 'v', label: 'Velocidade (v)', unit: 'm/s', placeholder: 'Ex: 6' },
    ],
    compute(vals) {
      const { m, v } = vals;
      if (m <= 0) throw new Error('A massa deve ser maior que zero.');
      const p = m * v;
      return {
        formula: 'p = m · v',
        steps: [`p = ${fmt(m)} × ${fmt(v)} = ${fmt(p)} kg·m/s`],
        results: [{ label: 'Quantidade de movimento', value: fmt(p), unit: 'kg·m/s' }],
      };
    },
  },
];

// =====================================================================
// Renderização da interface
// =====================================================================
const calcTypeSelect = document.getElementById('calcType');
const calcDescription = document.getElementById('calcDescription');
const inputsForm = document.getElementById('inputsForm');
const resultsContent = document.getElementById('resultsContent');
const clearBtn = document.getElementById('clearBtn');

function populateCalcTypeSelect() {
  CALCULATIONS.forEach(calc => {
    const opt = document.createElement('option');
    opt.value = calc.id;
    opt.textContent = calc.name;
    calcTypeSelect.appendChild(opt);
  });
}

function getSelectedCalculation() {
  return CALCULATIONS.find(c => c.id === calcTypeSelect.value);
}

function renderFields(calc) {
  inputsForm.innerHTML = '';
  calcDescription.textContent = calc.description;

  calc.fields.forEach(field => {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';

    const label = document.createElement('label');
    label.setAttribute('for', `f_${field.id}`);
    label.textContent = `${field.label} (${field.unit})`;
    wrapper.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.id = `f_${field.id}`;
    input.name = field.id;
    input.placeholder = field.placeholder || '';
    if (field.default !== undefined) input.value = field.default;
    wrapper.appendChild(input);

    if (field.isGravity) {
      const presetsRow = document.createElement('div');
      presetsRow.className = 'presets-row';
      G_PRESETS.forEach(preset => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-btn';
        btn.textContent = preset.label;
        btn.addEventListener('click', () => {
          input.value = preset.value;
        });
        presetsRow.appendChild(btn);
      });
      wrapper.appendChild(presetsRow);
    }

    inputsForm.appendChild(wrapper);
  });
}

function showPlaceholder() {
  resultsContent.innerHTML = `
    <p class="placeholder">Preencha os valores ao lado e clique em <strong>Calcular</strong> para ver a fórmula, a substituição dos valores e o resultado.</p>
  `;
}

function showError(message) {
  resultsContent.innerHTML = `<div class="result-error">⚠️ ${message}</div>`;
}

function showResult(calc, output) {
  const stepsHtml = output.steps.map(step => `<li>${step}</li>`).join('');
  const answersHtml = output.results
    .map(r => `
      <div class="answer-card">
        <span class="answer-label">${r.label}</span>
        <span class="answer-value">${r.value} ${r.unit}</span>
      </div>
    `)
    .join('');

  resultsContent.innerHTML = `
    <div class="formula-box">
      <p class="formula-title">Fórmula utilizada — ${calc.name}</p>
      <p class="formula-text">${output.formula}</p>
    </div>
    <ul class="steps-list">${stepsHtml}</ul>
    <div class="answers-grid">${answersHtml}</div>
  `;
}

function collectValues(calc) {
  const values = {};
  for (const field of calc.fields) {
    const raw = document.getElementById(`f_${field.id}`).value;
    const num = toNumber(raw);
    if (Number.isNaN(num)) {
      throw new Error(`Preencha o campo "${field.label}" com um número válido.`);
    }
    values[field.id] = num;
  }
  return values;
}

function handleCalcTypeChange() {
  const calc = getSelectedCalculation();
  renderFields(calc);
  showPlaceholder();
}

function handleSubmit(event) {
  event.preventDefault();
  const calc = getSelectedCalculation();
  try {
    const values = collectValues(calc);
    const output = calc.compute(values);
    showResult(calc, output);
  } catch (err) {
    showError(err.message || 'Não foi possível calcular com os valores informados.');
  }
}

function handleClear() {
  const calc = getSelectedCalculation();
  renderFields(calc);
  showPlaceholder();
}

// =====================================================================
// Inicialização
// =====================================================================
populateCalcTypeSelect();
renderFields(getSelectedCalculation());
showPlaceholder();
setRandomBackground();

calcTypeSelect.addEventListener('change', handleCalcTypeChange);
inputsForm.addEventListener('submit', handleSubmit);
clearBtn.addEventListener('click', handleClear);