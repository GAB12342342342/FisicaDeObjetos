// ==========================================
// CONFIGURAÇÃO DOS OBJETOS
// Cada objeto tem propriedades físicas únicas
// ==========================================
const OBJETOS = {
    futebol: {
        nome: 'Bola de Futebol',
        emoji: '⚽',
        cor: '#ffffff',
        tamanho: 12,
        massa: 0.43,          // kg
        arrasto: 0.25,        // coeficiente de arrasto
        propulsao: false
    },
    canhao: {
        nome: 'Bola de Canhão',
        emoji: '💣',
        cor: '#333333',
        tamanho: 15,
        massa: 5.0,
        arrasto: 0.1,
        propulsao: false
    },
    pena: {
        nome: 'Pena',
        emoji: '🪶',
        cor: '#f0e68c',
        tamanho: 10,
        massa: 0.005,
        arrasto: 2.5,         // alto arrasto
        propulsao: false
    },
    foguete: {
        nome: 'Foguete',
        emoji: '🚀',
        cor: '#ff4444',
        tamanho: 18,
        massa: 1.0,
        arrasto: 0.15,
        propulsao: true       // tem propulsão contínua
    },
    passaro: {
        nome: 'Pássaro',
        emoji: '🐦',
        cor: '#4ade80',
        tamanho: 14,
        massa: 0.1,
        arrasto: 0.4,
        propulsao: true       // "voa" com propulsão
    }
};

// ==========================================
// ESTADO DA SIMULAÇÃO
// ==========================================
let estado = {
    objetoAtual: 'futebol',
    angulo: 45,
    velocidade: 50,
    gravidade: 9.8,
    tempo: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lancando: false,
    trajetoria: [],
    alcanceMax: 0,
    alturaMax: 0
};

// ==========================================
// REFERÊNCIAS DOM
// ==========================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const seletorObjeto = document.getElementById('objeto');
const sliderAngulo = document.getElementById('angulo');
const sliderVelocidade = document.getElementById('velocidade');
const sliderGravidade = document.getElementById('gravidade');

const valorAngulo = document.getElementById('anguloValor');
const valorVelocidade = document.getElementById('velocidadeValor');
const valorGravidade = document.getElementById('gravidadeValor');

const btnLancar = document.getElementById('btnLancar');
const btnReset = document.getElementById('btnReset');

const displayTempo = document.getElementById('tempo');
const displayAltura = document.getElementById('altura');
const displayDistancia = document.getElementById('distancia');
const displayVelAtual = document.getElementById('velAtual');
const displayAlcanceMax = document.getElementById('alcanceMax');
const displayAlturaMax = document.getElementById('alturaMax');

// ==========================================
// AJUSTE DO CANVAS
// ==========================================
function ajustarCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
window.addEventListener('resize', ajustarCanvas);
ajustarCanvas();

// ==========================================
// FUNÇÕES DE ESCALA (m -> pixels)
// ==========================================
function metroParaPixelX(metros) {
    return 50 + (metros * canvas.width) / 500;
}

function metroParaPixelY(metros) {
    return canvas.height - 50 - (metros * canvas.height) / 300;
}

// ==========================================
// DESENHO DO CENÁRIO
// ==========================================
function desenharCenario() {
    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenha o chão
    const gradiente = ctx.createLinearGradient(0, canvas.height - 50, 0, canvas.height);
    gradiente.addColorStop(0, '#4a3b2a');
    gradiente.addColorStop(1, '#2a1b0a');
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    
    // Linhas de grade (marcadores de distância)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.font = '10px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    
    for (let i = 0; i <= 500; i += 50) {
        const px = metroParaPixelX(i);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height - 50);
        ctx.stroke();
        ctx.fillText(i + 'm', px - 10, canvas.height - 35);
    }
    
    for (let i = 0; i <= 300; i += 50) {
        const py = metroParaPixelY(i);
        ctx.beginPath();
        ctx.moveTo(50, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();
        if (i > 0) ctx.fillText(i + 'm', 10, py + 4);
    }
    
    // Desenha o lançador (canhão)
    const px = metroParaPixelX(0);
    const py = metroParaPixelY(0);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-estado.angulo * Math.PI / 180);
    ctx.fillStyle = '#666';
    ctx.fillRect(0, -8, 40, 16);
    ctx.restore();
    
    // Base do lançador
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fill();
}

// ==========================================
// DESENHO DO OBJETO
// ==========================================
function desenharObjeto() {
    const obj = OBJETOS[estado.objetoAtual];
    const px = metroParaPixelX(estado.x);
    const py = metroParaPixelY(estado.y);
    
    // Rastro da trajetória
    if (estado.trajetoria.length > 1) {
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(metroParaPixelX(estado.trajetoria[0].x), 
                   metroParaPixelY(estado.trajetoria[0].y));
        for (let ponto of estado.trajetoria) {
            ctx.lineTo(metroParaPixelX(ponto.x), metroParaPixelY(ponto.y));
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Objeto (emoji)
    ctx.font = `${obj.tamanho * 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.emoji, px, py);
    
    // Sombra/brilho
    ctx.shadowColor = obj.cor;
    ctx.shadowBlur = 15;
    ctx.fillText(obj.emoji, px, py);
    ctx.shadowBlur = 0;
}

// ==========================================
// FÍSICA: CÁLCULO DO MOVIMENTO
// ==========================================
function atualizarFisica(dt) {
    const obj = OBJETOS[estado.objetoAtual];
    
    // Força da gravidade
    let ax = 0;
    let ay = -estado.gravidade;
    
    // Resistência do ar (arrasto)
    const velocidade = Math.sqrt(estado.vx * estado.vx + estado.vy * estado.vy);
    if (velocidade > 0) {
        const forcaArrasto = 0.5 * obj.arrasto * velocidade * velocidade / obj.massa;
        ax -= (estado.vx / velocidade) * forcaArrasto;
        ay -= (estado.vy / velocidade) * forcaArrasto;
    }
    
    // Propulsão (foguete/pássaro)
    if (obj.propulsao && estado.tempo < 3) {
        const anguloRad = estado.angulo * Math.PI / 180;
        const forcaPropulsao = 30;
        ax += Math.cos(anguloRad) * forcaPropulsao;
        ay += Math.sin(anguloRad) * forcaPropulsao;
    }
    
    // Atualiza velocidades (integração de Euler)
    estado.vx += ax * dt;
    estado.vy += ay * dt;
    
    // Atualiza posições
    estado.x += estado.vx * dt;
    estado.y += estado.vy * dt;
    
    // Atualiza tempo
    estado.tempo += dt;
    
    // Registra trajetória
    estado.trajetoria.push({ x: estado.x, y: estado.y });
    
    // Atualiza máximos
    if (estado.y > estado.alturaMax) estado.alturaMax = estado.y;
    if (estado.x > estado.alcanceMax) estado.alcanceMax = estado.x;
    
    // Verifica colisão com o chão
    if (estado.y <= 0 && estado.tempo > 0.1) {
        estado.y = 0;
        estado.lancando = false;
    }
}

// ==========================================
// ATUALIZAÇÃO DOS DISPLAYS
// ==========================================
function atualizarDisplays() {
    const velocidadeAtual = Math.sqrt(estado.vx * estado.vx + estado.vy * estado.vy);
    displayTempo.textContent = estado.tempo.toFixed(2);
    displayAltura.textContent = Math.max(0, estado.y).toFixed(2);
    displayDistancia.textContent = estado.x.toFixed(2);
    displayVelAtual.textContent = velocidadeAtual.toFixed(2);
    displayAlcanceMax.textContent = estado.alcanceMax.toFixed(2);
    displayAlturaMax.textContent = estado.alturaMax.toFixed(2);
}

// ==========================================
// LOOP DE ANIMAÇÃO
// ==========================================
let ultimoTempo = 0;
function loopAnimacao(timestamp) {
    if (!ultimoTempo) ultimoTempo = timestamp;
    const dt = (timestamp - ultimoTempo) / 1000;
    ultimoTempo = timestamp;
    
    if (estado.lancando) {
        atualizarFisica(dt);
    }
    
    desenharCenario();
    desenharObjeto();
    atualizarDisplays();
    
    requestAnimationFrame(loopAnimacao);
}

// ==========================================
// EVENTOS DOS CONTROLES
// ==========================================
seletorObjeto.addEventListener('change', (e) => {
    estado.objetoAtual = e.target.value;
    resetarSimulacao();
});

sliderAngulo.addEventListener('input', (e) => {
    estado.angulo = parseInt(e.target.value);
    valorAngulo.textContent = estado.angulo;
});

sliderVelocidade.addEventListener('input', (e) => {
    estado.velocidade = parseInt(e.target.value);
    valorVelocidade.textContent = estado.velocidade;
});

sliderGravidade.addEventListener('input', (e) => {
    estado.gravidade = parseFloat(e.target.value);
    valorGravidade.textContent = estado.gravidade.toFixed(1);
});

btnLancar.addEventListener('click', () => {
    if (estado.lancando) return;
    
    // Converte velocidade e ângulo em componentes vx e vy
    const anguloRad = estado.angulo * Math.PI / 180;
    estado.vx = estado.velocidade * Math.cos(anguloRad);
    estado.vy = estado.velocidade * Math.sin(anguloRad);
    estado.x = 0;
    estado.y = 0;
    estado.tempo = 0;
    estado.trajetoria = [{ x: 0, y: 0 }];
    estado.alturaMax = 0;
    estado.alcanceMax = 0;
    estado.lancando = true;
});

btnReset.addEventListener('click', resetarSimulacao);

function resetarSimulacao() {
    estado.tempo = 0;
    estado.x = 0;
    estado.y = 0;
    estado.vx = 0;
    estado.vy = 0;
    estado.lancando = false;
    estado.trajetoria = [];
    estado.alturaMax = 0;
    estado.alcanceMax = 0;
    atualizarDisplays();
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
requestAnimationFrame(loopAnimacao);